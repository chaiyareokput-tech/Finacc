import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// ใช้ Environment Variable แบบ VITE (import.meta.env)
// ใน Vercel ให้ตั้งค่า Environment Variable ชื่อ VITE_API_KEY
const apiKey = import.meta.env.VITE_API_KEY || '';

const ai = new GoogleGenAI({ apiKey: apiKey });

interface FileData {
  data: string;
  mimeType: string;
}

export const analyzeFinancialData = async (file: FileData): Promise<AnalysisResult> => {
  if (!apiKey) {
    throw new Error("ไม่พบ API Key กรุณาตั้งค่า Environment Variable (VITE_API_KEY)");
  }

  const prompt = `
    คุณคือ CFO และผู้เชี่ยวชาญด้านการวิเคราะห์งบการเงิน (Financial Analyst) ระดับสูง
    หน้าที่ของคุณคือการวิเคราะห์ไฟล์ข้อมูลการเงินที่ได้รับ (Excel/CSV/PDF) เพื่อสร้างรายงานเชิงลึกที่อ่านง่ายและสวยงาม

    **คำสั่งการวิเคราะห์:**

    1.  **Financial Ratios Analysis (เจาะลึกอัตราส่วน):** 
        *   คำนวณและวิเคราะห์อัตราส่วนสำคัญ 4 ด้าน: 
            1. สภาพคล่อง (Liquidity: Current Ratio)
            2. ความสามารถในการทำกำไร (Profitability: Net Profit Margin, ROE)
            3. ประสิทธิภาพ (Efficiency: Asset Turnover)
            4. ภาระหนี้สิน (Leverage: D/E Ratio)
        *   ระบุสถานะ (Good/Warning/Critical) ของแต่ละตัวพร้อมคำอธิบายสั้นๆ ที่เข้าใจง่าย

    2.  **Significant Variance (รายการผิดปกติ):**
        *   ค้นหารายการที่เพิ่ม/ลดอย่างมีนัยสำคัญ
        *   **ต้องระบุหน่วยงาน (Department)** ให้ชัดเจนที่สุดเท่าที่จะหาได้จากไฟล์ (เช่น "การไฟฟ้า", "BusA") หากไม่พบให้ระบุ "General"

    3.  **Formal Executive Report (บทรายงานผู้บริหาร):**
        *   เขียนในรูปแบบ **Markdown** ที่สวยงาม (ใช้ Header #, Bullet points, Bold text)
        *   ใช้ภาษาไทยที่เป็นทางการแต่ **"อ่านง่าย เข้าใจง่าย"** (Professional yet Accessible)
        *   **โครงสร้างรายงาน:**
            *   ## 1. บทสรุปผู้บริหาร (Executive Summary): สรุปประเด็นสำคัญที่สุด 3-4 ข้อ
            *   ## 2. ผลการดำเนินงาน (Performance): วิเคราะห์รายได้และกำไร แยกตามหน่วยงาน (ถ้ามี)
            *   ## 3. สุขภาพทางการเงิน (Financial Health): วิเคราะห์สภาพคล่องและหนี้สิน
            *   ## 4. แนวโน้มในอนาคต (Future Outlook): คาดการณ์ทิศทางจากข้อมูลที่มี
            *   ## 5. ข้อเสนอแนะเชิงกลยุทธ์ (Strategic Recommendations): สิ่งที่ควรทำต่อไป

    **รูปแบบข้อมูล JSON Output:**
  `;

  try {
    const parts = [
      {
        text: prompt
      },
      {
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallAnalysis: {
              type: Type.STRING,
              description: "บทสรุปสั้นๆ 2-3 บรรทัด สำหรับแสดงบน Dashboard Card",
            },
            formalReport: {
              type: Type.STRING,
              description: "รายงานฉบับเต็ม format Markdown ที่สวยงาม อ่านง่าย",
            },
            significantChanges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  relatedDepartment: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  percentage: { type: Type.STRING },
                  trend: { type: Type.STRING, enum: ["increase", "decrease"] },
                  reason: { type: Type.STRING },
                },
              },
            },
            ratios: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "ชื่ออัตราส่วน (เช่น Current Ratio)" },
                  value: { type: Type.NUMBER },
                  unit: { type: Type.STRING, description: "หน่วย (เช่น เท่า, %)" },
                  status: { type: Type.STRING, enum: ["good", "warning", "critical"] },
                  description: { type: Type.STRING, description: "คำอธิบายความหมายสั้นๆ ภาษาชาวบ้าน" },
                },
              },
            },
            departments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  revenue: { type: Type.NUMBER },
                  expense: { type: Type.NUMBER },
                  profit: { type: Type.NUMBER },
                  liquidityComment: { type: Type.STRING },
                },
              },
            },
            topHighItems: { type: Type.ARRAY, items: { type: Type.STRING } },
            topLowItems: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });

    if (response.text) {
      let cleanText = response.text.trim();
      // ลบ Markdown Code Block ที่อาจติดมา
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
      
      return JSON.parse(cleanText) as AnalysisResult;
    } else {
      throw new Error("ไม่ได้รับข้อมูลตอบกลับจาก AI");
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล: " + (error instanceof Error ? error.message : String(error)));
  }
};