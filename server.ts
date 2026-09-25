import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Safe resolution of directory for both tsx dev (ESM) and esbuild production (CJS bundle)
const currentDirname = typeof __dirname !== 'undefined'
  ? __dirname
  : (typeof import.meta !== 'undefined' && import.meta.url
      ? path.dirname(fileURLToPath(import.meta.url))
      : process.cwd());

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Accept up to 50MB payloads for high-resolution invoice photos and PDF uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Permissive CORS middleware for cross-origin or sandboxed iframe preview requests
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Bazu POS Server',
      timestamp: new Date().toISOString(),
      gemini_configured: !!process.env.GEMINI_API_KEY,
    });
  });

  // Multimodal Stock Parser (Invoice / Receipt / Shelf Photo / PDF)
  app.post('/api/parse-stock', async (req, res) => {
    try {
      console.log(`[/api/parse-stock] Received request at ${new Date().toISOString()}`);
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error('[/api/parse-stock] GEMINI_API_KEY missing');
        return res.status(400).json({
          success: false,
          error: 'GEMINI_API_KEY is not configured in the environment.',
        });
      }

      const { fileBase64, mimeType, filename } = req.body;
      if (!fileBase64 || !mimeType) {
        console.error('[/api/parse-stock] Missing fileBase64 or mimeType');
        return res.status(400).json({
          success: false,
          error: 'Missing fileBase64 or mimeType in request.',
        });
      }

      console.log(`[/api/parse-stock] File: ${filename || 'unnamed'}, mimeType: ${mimeType}, base64 length: ${fileBase64.length}`);

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Clean base64 data prefix if present
      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');

      const prompt = `You are an expert retail store and liquor POS inventory auditor.
Carefully examine the attached receipt, supplier invoice, delivery note, order slip, or document.

CRITICAL EXTRACTION RULES:
1. ONLY extract the actual product line items visible in the provided image or document.
2. DO NOT invent, hallucinate, or copy example product names. If no items or text can be deciphered, return an empty array: {"items": []}.
3. Extract the exact product description / brand name and pack size (e.g. "Heineken 500ml", "Gilbeys Gin 750ml", "Tusker Lager 500ml", "Captain Morgan Gold 750ml").
4. For each item:
   - "name": Clean, exact product name with volume or size if indicated.
   - "category": Detected category (e.g. "Beer", "Cider", "Whisky", "Gin", "Vodka", "Wine", "Rum", "Brandy", "Liqueur", "Soft Drinks", "General").
   - "quantity": The exact quantity delivered/purchased. If crates/cases/cartons are specified (e.g. "2 crates of 24" or "1 case 12x750ml"), calculate the total individual unit count (e.g. 48 or 12). If simply "10", output 10.
   - "unit": "Bottle", "Can", "Pack", "Box", "Pieces", etc.
   - "cost_price": Unit purchase or wholesale cost in KES if visible on invoice, otherwise null.
   - "selling_price": Suggested or retail selling price if visible, otherwise null.
   - "barcode": Barcode number if visible on the document, otherwise null.
5. Extract metadata if visible: supplier name, invoice number, notes.`;

      const imagePart = {
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType,
        },
      };

      const textPart = {
        text: prompt,
      };

      // Prioritize gemini-3.1-flash-lite (fast & robust for multimodal extraction), with gemini-3.8-flash as fallback
      const CANDIDATE_MODELS = [
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash',
      ];

      let lastError: any = null;
      let parsedData: any = null;

      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: [imagePart, textPart] },
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        category: { type: Type.STRING },
                        quantity: { type: Type.NUMBER },
                        unit: { type: Type.STRING },
                        cost_price: { type: Type.NUMBER, nullable: true },
                        selling_price: { type: Type.NUMBER, nullable: true },
                        barcode: { type: Type.STRING, nullable: true },
                      },
                      required: ['name', 'quantity'],
                    },
                  },
                  confidence: { type: Type.STRING },
                  supplier_name: { type: Type.STRING, nullable: true },
                  invoice_number: { type: Type.STRING, nullable: true },
                  notes: { type: Type.STRING, nullable: true },
                },
                required: ['items'],
              },
            },
          });

          const responseText = response.text || '{}';
          parsedData = JSON.parse(responseText);
          lastError = null;
          break; // Success!
        } catch (modelErr: any) {
          console.warn(`Model ${modelName} parse failed, trying next fallback:`, modelErr?.message || modelErr);
          lastError = modelErr;
        }
      }

      if (lastError || !parsedData) {
        throw lastError || new Error('All Gemini model candidates failed to parse document.');
      }

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (error: any) {
      console.error('Error parsing stock upload with Gemini:', error);
      return res.status(500).json({
        success: false,
        error: error?.message || 'Failed to parse image/document with Gemini AI.',
      });
    }
  });

  // Detect if running from production bundle in dist or if production dist exists
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    currentDirname.endsWith('dist') ||
    currentDirname.includes('/dist');

  const distPath = currentDirname.endsWith('dist')
    ? currentDirname
    : path.join(process.cwd(), 'dist');

  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (isProduction && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const viteConfigPath = path.resolve(process.cwd(), 'vite.config.ts');
    const vite = await createViteServer({
      configFile: fs.existsSync(viteConfigPath) ? viteConfigPath : false,
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bazu POS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
