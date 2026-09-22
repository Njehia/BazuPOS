import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

      const prompt = `You are an expert retail liquor store inventory auditor in Kenya.
Analyze the attached document or photo (which may be an alcohol delivery invoice, supplier delivery note from EABL/KBL/UDV/Pernod Ricard/distributors, handwritten restock slip, or photo of shelves/crates).

Extract all liquor, beer, wine, spirit, or beverage restock items.
Return ONLY valid JSON matching this schema:
{
  "items": [
    {
      "name": "Full product brand name and volume (e.g., Tusker Lager 500ml, Gilbeys Gin 750ml, Johnnie Walker Black 750ml, White Cap 500ml, Chrome Gin 250ml, Smirnoff Red 750ml)",
      "category": "Beer | Whisky | Gin | Vodka | Wine | Rum | Brandy | Tequila | Liqueur | Cider | Soft Drinks | General",
      "quantity": 24, // integer count of bottles/units received
      "unit": "Bottle | Can | Pack | Crate | 500ml | 750ml | 1L",
      "cost_price": 200, // unit cost price in KES if visible, otherwise null
      "selling_price": 250, // retail selling price in KES if visible, otherwise null
      "barcode": "" // barcode if visible, otherwise empty string
    }
  ],
  "confidence": "HIGH | MEDIUM | LOW",
  "supplier_name": "Supplier or distributor name if discernible, else null",
  "invoice_number": "Invoice / Order # if discernible, else null",
  "notes": "Brief extraction notes or summary"
}

If crate quantities are listed (e.g., '2 crates of 24'), calculate total bottle units (e.g., 48 bottles). Ensure quantities are positive numbers.`;

      const imagePart = {
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType,
        },
      };

      const textPart = {
        text: prompt,
      };

      const CANDIDATE_MODELS = [
        'gemini-flash-latest',
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

  // Vite middleware for dev or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bazu POS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
