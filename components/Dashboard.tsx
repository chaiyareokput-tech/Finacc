import React, { useState, useMemo } from 'react';
import { AnalysisResult } from '../types';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle2, 
  FileText, LayoutDashboard, ArrowUpRight, ArrowDownRight, Filter, 
  Download, FileSpreadsheet, BarChart3, PieChart as PieChartIcon, 
  LineChart as LineChartIcon, DollarSign, Wallet, ChevronDown, ChevronRight
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';

interface DashboardProps {
  data: AnalysisResult;
  onReset: () => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// --- Helper Components for Report Viewer ---

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  // Simple parser to handle bold text (**text**) and bullet points
  const lines = content.split('\n');
  return (
    <div className="space-y-2 text-slate-700 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2"></div>;
        
        // Handle Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const text = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start ml-4">
              <span className="mr-2 mt-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0"></span>
              <span dangerouslySetInnerHTML={{ 
                __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-semibold">$1</strong>') 
              }} />
            </div>
          );
        }

        // Handle normal text
        return (
          <p key={idx} dangerouslySetInnerHTML={{ 
            __html: trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-semibold">$1</strong>') 
          }} />
        );
      })}
    </div>
  );
};

const CollapsibleSection: React.FC<{ title: string; content: string; defaultOpen?: boolean }> = ({ title, content, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden mb-4 bg-white shadow-sm transition-all hover:shadow-md">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <h3 className="font-bold text-slate-800 flex items-center text-lg">
          {isOpen ? <ChevronDown className="w-5 h-5 mr-2 text-indigo-600" /> : <ChevronRight className="w-5 h-5 mr-2 text-slate-400" />}
          {title.replace(/^#+\s*/, '')}
        </h3>
      </button>
      
      {isOpen && (
        <div className="p-6 bg-white animate-fade-in border-t border-slate-100">
          <MarkdownRenderer content={content} />
        </div>
      )}
    </div>
  );
};

const ReportViewer: React.FC<{ report: string }> = ({ report }) => {
  // Split report by Headers (##)
  const sections = useMemo(() => {
    if (!report) return [];
    // Split by lines starting with ##
    const parts = report.split(/(?=^##\s)/m);
    return parts.filter(p => p.trim().length > 0).map(part => {
      const lines = part.split('\n');
      const title = lines[0].trim();
      const content = lines.slice(1).join('\n').trim();
      return { title, content };
    });
  }, [report]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {sections.length > 0 ? (
        sections.map((sec, idx) => (
          <CollapsibleSection 
            key={idx} 
            title={sec.title} 
            content={sec.content} 
            defaultOpen={idx === 0 || idx === 1} // Open first two sections by default
          />
        ))
      ) : (
        <div className="p-8 text-center text-slate-400">กำลังประมวลผลรูปแบบรายงาน...</div>
      )}
    </div>
  );
};

// --- Main Dashboard Component ---

export const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'report'>('dashboard');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');

  // Logic: Extract Departments
  const availableDepartments = useMemo(() => {
    const depts = new Set<string>(['All']);
    if (data.departments) {
      data.departments.forEach(d => depts.add(d.name));
    }
    if (data.significantChanges) {
      data.significantChanges.forEach(c => {
        if (c.relatedDepartment) depts.add(c.relatedDepartment);
      });
    }
    return Array.from(depts).sort();
  }, [data]);

  // Logic: Filter Data
  const filteredChanges = useMemo(() => {
    if (!data.significantChanges) return [];
    if (selectedDept === 'All') return data.significantChanges;
    return data.significantChanges.filter(item => 
      item.relatedDepartment === selectedDept || 
      (item.relatedDepartment === 'General' && selectedDept === 'All')
    );
  }, [data.significantChanges, selectedDept]);

  const filteredDepts = useMemo(() => {
    if (!data.departments) return [];
    if (selectedDept === 'All') return data.departments;
    return data.departments.filter(d => d.name === selectedDept);
  }, [data.departments, selectedDept]);

  // Export Logic (Excel)
  const handleExportExcel = () => {
    try {
      const wb = utils.book_new();

      const reportData = [
        ["SmartAcc Analyst Report"],
        ["วันที่พิมพ์:", new Date().toLocaleDateString('th-TH')],
        [],
        ["สรุปผู้บริหาร"],
        [data.overallAnalysis],
        [],
        ["---------------------------------------------------"],
        [],
        ["บทรายงานฉบับเต็ม"],
        [data.formalReport] 
      ];
      const wsReport = utils.aoa_to_sheet(reportData);
      utils.book_append_sheet(wb, wsReport, "Executive Report");

      if (data.significantChanges?.length > 0) {
        const changesData = data.significantChanges.map(item => ({
          "รายการ": item.item,
          "หน่วยงาน": item.relatedDepartment || "N/A",
          "แนวโน้ม": item.trend === 'increase' ? 'เพิ่มขึ้น' : 'ลดลง',
          "เปลี่ยนแปลง (%)": item.percentage,
          "จำนวนเงิน": item.amount,
          "สาเหตุ": item.reason
        }));
        const wsChanges = utils.json_to_sheet(changesData);
        utils.book_append_sheet(wb, wsChanges, "Variance Analysis");
      }

      if (data.ratios?.length > 0) {
        const ratiosData = data.ratios.map(item => ({
          "อัตราส่วน": item.name,
          "ค่า": item.value,
          "หน่วย": item.unit,
          "สถานะ": item.status,
          "คำอธิบาย": item.description
        }));
        const wsRatios = utils.json_to_sheet(ratiosData);
        utils.book_append_sheet(wb, wsRatios, "Financial Ratios");
      }
      
      writeFile(wb, "SmartAcc_Financial_Report.xlsx");
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel");
    }
  };

  // Render Functions
  const renderChart = () => {
    const chartData = filteredDepts;
    if (!chartData || chartData.length === 0) return <div className="flex h-64 items-center justify-center text-gray-400">ไม่มีข้อมูลแสดงกราฟ</div>;

    if (chartType === 'pie') {
      let pieData;
      if (selectedDept === 'All') {
        pieData = chartData.map(d => ({ name: d.name, value: d.revenue }));
      } else {
        const dept = chartData[0];
        pieData = [{ name: 'รายรับ', value: dept.revenue }, { name: 'รายจ่าย', value: dept.expense }];
      }

      return (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={selectedDept === 'All' ? COLORS[index % COLORS.length] : (index === 0 ? '#10b981' : '#ef4444')} />
              ))}
            </Pie>
            <Tooltip formatter={(val:number) => new Intl.NumberFormat('th-TH').format(val)} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{fill: '#64748b', fontSize: 12}} />
            <Tooltip cursor={{fill: '#f8fafc'}} formatter={(val:number) => new Intl.NumberFormat('th-TH').format(val)} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
            <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} />
            <Line dataKey="revenue" name="รายรับ" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
            <Line dataKey="expense" name="รายจ่าย" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
            <Line dataKey="profit" name="กำไรสุทธิ" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // Default to Bar
    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
          <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{fill: '#64748b', fontSize: 12}} />
          <Tooltip cursor={{fill: '#f8fafc'}} formatter={(val:number) => new Intl.NumberFormat('th-TH').format(val)} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
          <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} />
          <Bar dataKey="revenue" name="รายรับ" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
          <Bar dataKey="expense" name="รายจ่าย" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
          <Bar dataKey="profit" name="กำไรสุทธิ" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl font-sans">
      {/* Top Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <span className="bg-indigo-600 text-white p-2 rounded-lg mr-3 shadow-indigo-200 shadow-md">
              <Activity className="w-6 h-6" />
            </span>
            ผลการวิเคราะห์ทางการเงิน
          </h1>
          <p className="text-slate-500 mt-1 ml-12">SmartAcc Analyst • ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH', {year: 'numeric', month: 'long', day: 'numeric'})}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Tabs */}
           <div className="bg-slate-100 p-1 rounded-xl flex text-sm font-medium">
             <button
               onClick={() => setActiveTab('dashboard')}
               className={`px-5 py-2.5 rounded-lg flex items-center transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <LayoutDashboard className="w-4 h-4 mr-2" />
               Dashboard
             </button>
             <button
               onClick={() => setActiveTab('report')}
               className={`px-5 py-2.5 rounded-lg flex items-center transition-all duration-200 ${activeTab === 'report' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <FileText className="w-4 h-4 mr-2" />
               บทรายงาน
             </button>
           </div>

           {activeTab === 'dashboard' && (
             <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2.5 h-[46px] shadow-sm hover:border-indigo-400 transition-colors">
                <Filter className="w-4 h-4 text-slate-400 mr-2" />
                <select 
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="bg-transparent text-sm text-slate-700 focus:ring-0 cursor-pointer outline-none font-medium"
                >
                  {availableDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept === 'All' ? 'ภาพรวมทั้งหมด (All)' : dept}</option>
                  ))}
                </select>
             </div>
           )}
           
          <button onClick={onReset} className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-5 py-2.5 rounded-xl transition-colors font-medium text-sm h-[46px]">
            วิเคราะห์ใหม่
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="animate-fade-in space-y-6">
          
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
            
            <h3 className="text-indigo-100 font-medium mb-3 flex items-center uppercase tracking-wider text-xs">
               <Activity className="w-4 h-4 mr-2" /> Executive Summary
            </h3>
            <p className="text-xl md:text-2xl leading-relaxed font-light text-white opacity-95">
              "{data.overallAnalysis}"
            </p>
          </div>

          {/* Financial Ratios Grid - Highlighting this section */}
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
              <Wallet className="w-5 h-5 mr-2 text-emerald-600" />
              อัตราส่วนทางการเงินที่สำคัญ (Key Financial Ratios)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {data.ratios.map((ratio, index) => {
                let colorClass = 'bg-slate-100 text-slate-600';
                let barColor = 'bg-slate-400';
                let icon = <Activity className="w-5 h-5" />;
                
                if (ratio.status === 'good') {
                   colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                   barColor = 'bg-emerald-500';
                   icon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
                } else if (ratio.status === 'warning') {
                   colorClass = 'bg-amber-50 text-amber-700 border-amber-100';
                   barColor = 'bg-amber-500';
                   icon = <AlertTriangle className="w-5 h-5 text-amber-500" />;
                } else if (ratio.status === 'critical') {
                   colorClass = 'bg-red-50 text-red-700 border-red-100';
                   barColor = 'bg-red-500';
                   icon = <TrendingDown className="w-5 h-5 text-red-500" />;
                }

                return (
                  <div key={index} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{ratio.name}</span>
                      {icon}
                    </div>
                    <div className="flex items-baseline mb-2">
                       <span className="text-3xl font-bold text-slate-800">{ratio.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                       <span className="ml-1 text-sm text-slate-400 font-medium">{ratio.unit}</span>
                    </div>
                    
                    {/* Visual Status Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
                      <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: ratio.status === 'good' ? '80%' : ratio.status === 'warning' ? '50%' : '20%' }}></div>
                    </div>

                    <div className={`text-xs p-2 rounded-lg ${colorClass}`}>
                      {ratio.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Variance Analysis Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
                    วิเคราะห์รายการเปลี่ยนแปลง ({selectedDept === 'All' ? 'ภาพรวม' : selectedDept})
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">รายการที่มีการ เพิ่ม/ลด อย่างมีนัยสำคัญ</p>
                </div>
              </div>
              <div className="overflow-x-auto flex-grow">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">รายการ</th>
                      <th className="px-4 py-4">หน่วยงาน</th>
                      <th className="px-6 py-4 text-right">เปลี่ยนแปลง</th>
                      <th className="px-6 py-4 text-right">จำนวนเงิน</th>
                      <th className="px-6 py-4 w-1/3">สาเหตุวิเคราะห์</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredChanges && filteredChanges.length > 0 ? (
                      filteredChanges.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-800">{item.item}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium border border-slate-200">
                              {item.relatedDepartment || 'General'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                               item.trend === 'increase' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                             }`}>
                               {item.trend === 'increase' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                               {item.percentage}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600 font-mono text-sm">
                            {item.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {item.reason}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          ไม่พบข้อมูลที่มีการเปลี่ยนแปลงอย่างมีนัยสำคัญ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Main Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800">ประสิทธิภาพการดำเนินงาน</h2>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setChartType('bar')} className={`p-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>
                    <BarChart3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setChartType('line')} className={`p-1.5 rounded-md transition-all ${chartType === 'line' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>
                    <LineChartIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => setChartType('pie')} className={`p-1.5 rounded-md transition-all ${chartType === 'pie' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>
                    <PieChartIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-grow flex items-center justify-center">
                {renderChart()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* REPORT VIEW - Enhanced Readability */
        <div className="animate-fade-in bg-white rounded-2xl shadow-xl border border-slate-200 max-w-4xl mx-auto overflow-hidden min-h-[600px] flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-8 flex flex-col md:flex-row justify-between items-center gap-6 sticky top-0 z-10">
            <div className="text-center md:text-left">
               <div className="flex items-center justify-center md:justify-start mb-2">
                 <div className="bg-indigo-600 text-white p-2 rounded-lg mr-3">
                   <FileText className="w-6 h-6" />
                 </div>
                 <h1 className="text-2xl font-bold text-slate-900">รายงานวิเคราะห์ทางการเงิน</h1>
               </div>
               <p className="text-slate-500 ml-0 md:ml-14">SmartAcc Analysis Official Report</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleExportExcel} className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors shadow-lg shadow-indigo-200">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Download Report (.xlsx)
              </button>
            </div>
          </div>
          
          <div className="p-8 bg-slate-50/50 flex-grow">
             <ReportViewer report={data.formalReport || "กำลังสร้างรายงาน..."} />
             
             <div className="mt-12 text-center text-slate-400 text-sm">
                <p>Generated by SmartAcc AI Engine</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};