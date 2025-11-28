
import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { analyzeFinancialData } from './services/geminiService';
import { AnalysisResult, AppState } from './types';
import { Loader2, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.UPLOAD);
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Progress State for Analysis
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const handleFileUpload = async (file: { data: string; mimeType: string }) => {
    setState(AppState.ANALYZING);
    setAnalysisProgress(0);

    // Simulate analysis progress
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 2; // Increment slowly
      });
    }, 150);

    try {
      const result = await analyzeFinancialData(file);
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      
      // Small delay to show 100%
      setTimeout(() => {
        setAnalysisData(result);
        setState(AppState.RESULT);
      }, 500);

    } catch (error) {
      clearInterval(progressInterval);
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
      setState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setState(AppState.UPLOAD);
    setAnalysisData(null);
    setErrorMessage('');
    setAnalysisProgress(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
                 <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <span className="text-slate-800 text-xl font-bold tracking-tight">SmartAcc</span>
                <span className="text-indigo-600 font-medium ml-1">Analyst</span>
              </div>
            </div>
            {state === AppState.RESULT && (
              <div className="hidden md:flex items-center">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
                  AI Powered Finance
                </span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 relative overflow-hidden">
        
        {/* Background Elements */}
        {state !== AppState.RESULT && (
           <>
             <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
             <div className="absolute top-20 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
             <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
           </>
        )}

        {state === AppState.UPLOAD && (
          <div className="w-full max-w-4xl relative z-10 animate-fade-in-up">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                วิเคราะห์งบการเงิน<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
                  ด้วยพลัง AI อัจฉริยะ
                </span>
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                เปลี่ยนไฟล์งบการเงินที่ซับซ้อนให้เป็น Dashboard ที่เข้าใจง่าย วิเคราะห์สภาพคล่อง อัตราส่วนทางการเงิน และจุดผิดปกติได้ในไม่กี่วินาที
              </p>
            </div>
            <FileUpload onFileUpload={handleFileUpload} />
          </div>
        )}

        {state === AppState.ANALYZING && (
          <div className="text-center z-10 w-full max-w-md bg-white/60 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-xl">
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                 <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-2">กำลังวิเคราะห์ข้อมูลเชิงลึก</h2>
            <p className="text-slate-500 mb-6 text-sm">ระบบกำลังตรวจสอบสภาพคล่อง คำนวณอัตราส่วน และสร้างรายงาน...</p>
            
            {/* Analysis Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2 mb-2 overflow-hidden">
               <div 
                 className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                 style={{ width: `${analysisProgress}%` }}
               ></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-medium">
               <span>Processing Data</span>
               <span>{Math.round(analysisProgress)}%</span>
            </div>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-lg text-center z-10 animate-shake">
            <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">เกิดข้อผิดพลาด</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">{errorMessage}</p>
            <button 
              onClick={handleReset}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-200"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        )}

        {state === AppState.RESULT && analysisData && (
          <Dashboard data={analysisData} onReset={handleReset} />
        )}
      </main>

      {/* Footer */}
      {state !== AppState.RESULT && (
        <footer className="py-6 text-center text-slate-400 text-sm relative z-10">
          <p>© 2024 SmartAcc Analyst. Enterprise Grade Financial Analysis.</p>
        </footer>
      )}
    </div>
  );
};

export default App;
