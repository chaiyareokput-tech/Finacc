
import React, { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import { read, utils } from 'xlsx';

interface FileUploadProps {
  onFileUpload: (file: { data: string; mimeType: string }) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  // Effect เพื่อจำลอง Progress Bar
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing && progress < 90) {
      interval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.floor(Math.random() * 10), 90));
      }, 300);
    }
    return () => clearInterval(interval);
  }, [isProcessing, progress]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(10);
    setStatusText('กำลังอ่านไฟล์...');

    try {
      const isSpreadsheet = file.name.endsWith('.xlsx') || 
                            file.name.endsWith('.xls') || 
                            file.name.endsWith('.csv') ||
                            file.type.includes('spreadsheet') ||
                            file.type.includes('excel') ||
                            file.type === 'text/csv';

      setTimeout(() => { // Add slight delay for UX
        if (isSpreadsheet) {
          setStatusText('กำลังแปลงข้อมูล Excel/CSV...');
          const reader = new FileReader();
          reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = read(data, { type: 'array', codepage: 65001 });
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const csv = utils.sheet_to_csv(worksheet);
            const base64Data = window.btoa(unescape(encodeURIComponent(csv)));

            setProgress(100);
            setStatusText('เตรียมส่งข้อมูล...');
            
            // รอให้ Progress เต็ม 100 ก่อนส่ง
            setTimeout(() => {
                onFileUpload({ data: base64Data, mimeType: 'text/csv' });
            }, 500);
          };
          reader.readAsArrayBuffer(file);

        } else {
          setStatusText('กำลังประมวลผล PDF...');
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            const base64Data = result.split(',')[1];
            const mimeType = file.type || 'text/plain';

            setProgress(100);
            setStatusText('พร้อมวิเคราะห์...');
            
             setTimeout(() => {
                onFileUpload({ data: base64Data, mimeType });
            }, 500);
          };
          reader.readAsDataURL(file);
        }
      }, 800);

    } catch (error) {
      console.error("Error processing file:", error);
      setIsProcessing(false);
      setProgress(0);
      alert("เกิดข้อผิดพลาดในการอ่านไฟล์");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-8 text-center text-white">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
            <FileSpreadsheet className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">นำเข้าข้อมูลการเงิน</h2>
          <p className="text-blue-100 opacity-90">รองรับไฟล์ Excel, CSV หรือ PDF งบการเงิน</p>
        </div>

        {/* Upload Area */}
        <div className="p-8">
          {!isProcessing ? (
            <div className="relative group cursor-pointer">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center transition-all duration-300 group-hover:border-indigo-500 group-hover:bg-indigo-50/50">
                <div className="flex justify-center mb-4 transition-transform duration-300 group-hover:-translate-y-2">
                  <div className="bg-indigo-50 p-4 rounded-full group-hover:bg-indigo-100">
                    <Upload className="w-8 h-8 text-indigo-500" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">
                  คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง
                </h3>
                <p className="text-gray-400 text-sm mb-6">ขนาดไฟล์ไม่เกิน 10MB</p>
                
                <div className="flex justify-center gap-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    .XLSX
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    .CSV
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    .PDF
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 px-4 text-center">
               <div className="mb-4 flex justify-center">
                 {progress === 100 ? (
                    <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce" />
                 ) : (
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                 )}
               </div>
               <h3 className="text-lg font-semibold text-gray-800 mb-2">{statusText}</h3>
               
               {/* Progress Bar Container */}
               <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1 max-w-sm mx-auto overflow-hidden">
                 <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                 ></div>
               </div>
               <p className="text-xs text-gray-500 font-medium text-right max-w-sm mx-auto mt-1">{progress}%</p>
            </div>
          )}
          
          <div className="mt-8 flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
             <div className="mt-0.5">
               <FileText className="w-4 h-4 text-yellow-600" />
             </div>
             <div>
                <h4 className="text-sm font-semibold text-yellow-800">คำแนะนำ</h4>
                <p className="text-xs text-yellow-700 mt-1">
                  เพื่อผลลัพธ์ที่แม่นยำที่สุด หากเป็นไฟล์ Excel ควรมีหัวตารางที่ชัดเจน (เช่น ปี 2566, ปี 2567) 
                  ระบบจะเปรียบเทียบข้อมูลระหว่างปีให้อัตโนมัติ
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
