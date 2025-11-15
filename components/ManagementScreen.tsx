import React, { useState } from 'react';
import type { SessionData, SessionReport } from '../types';

interface ManagementScreenProps {
  onStartSession: (sessionData: SessionData) => void;
  reports: SessionReport[];
  onDeleteReport: (reportId: string) => void;
}

const ManagementScreen: React.FC<ManagementScreenProps> = ({ onStartSession, reports, onDeleteReport }) => {
  const [topic, setTopic] = useState('Động vật');
  const [vocabulary, setVocabulary] = useState('con chó, con mèo, con chim');
  const [selectedReport, setSelectedReport] = useState<SessionReport | null>(null);

  const handleStart = () => {
    const vocabArray = vocabulary.split(',').map(v => v.trim()).filter(Boolean);
    if (topic && vocabArray.length > 0) {
      onStartSession({ topic, vocabulary: vocabArray });
    } else {
      alert("Vui lòng nhập chủ đề và ít nhất một từ vựng.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">Bảng điều khiển</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1: Session Setup */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Bắt đầu phiên mới</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-600 mb-1">Chủ đề</label>
                <input
                  type="text"
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ví dụ: Gia đình, Thức ăn"
                />
              </div>
              <div>
                <label htmlFor="vocabulary" className="block text-sm font-medium text-gray-600 mb-1">Từ vựng (cách nhau bằng dấu phẩy)</label>
                <textarea
                  id="vocabulary"
                  value={vocabulary}
                  onChange={(e) => setVocabulary(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ví dụ: ba, mẹ, anh, chị"
                />
              </div>
              <button
                onClick={handleStart}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300"
              >
                Bắt đầu phiên mới
              </button>
            </div>
          </div>

          {/* Column 2 & 3: Reports */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-md">
             <h2 className="text-2xl font-semibold text-gray-700 mb-4">Kết quả các phiên</h2>
             <div className="flex flex-col md:flex-row gap-6 h-[70vh]">
                {/* Report List */}
                <div className="md:w-1/3 border-r border-gray-200 pr-4 overflow-y-auto">
                    <h3 className="text-lg font-medium text-gray-600 mb-2">Lịch sử</h3>
                    {reports.length === 0 ? (
                        <p className="text-gray-500">Chưa có báo cáo nào.</p>
                    ) : (
                        <ul className="space-y-2">
                        {reports.map(report => (
                            <li key={report.id} className="flex items-center group">
                                <button onClick={() => setSelectedReport(report)} className={`flex-grow text-left p-3 rounded-lg transition-colors ${selectedReport?.id === report.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}`}>
                                    <p className="font-semibold">{report.topic}</p>
                                    <p className="text-sm text-gray-500">{report.date} - {report.duration} phút</p>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Bạn có chắc chắn muốn xóa báo cáo này?')) {
                                            if (selectedReport?.id === report.id) {
                                                setSelectedReport(null);
                                            }
                                            onDeleteReport(report.id);
                                        }
                                    }}
                                    className="ml-2 p-2 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                    aria-label={`Xóa báo cáo ${report.topic}`}
                                >
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </li>
                        ))}
                        </ul>
                    )}
                </div>
                {/* Selected Report Details */}
                <div className="md:w-2/3 overflow-y-auto pl-4">
                    {selectedReport ? (
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold text-gray-800">{selectedReport.topic}</h3>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Độ chính xác</p>
                                    <p className="text-xl font-bold text-blue-700">{selectedReport.accuracy.toFixed(0)}%</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Tương tác</p>
                                    <p className="text-xl font-bold text-green-700">{selectedReport.engagement}</p>
                                </div>
                                <div className="bg-yellow-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-500">Thời lượng</p>
                                    <p className="text-xl font-bold text-yellow-700">{selectedReport.duration} phút</p>
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold text-gray-700 text-lg mb-2">Đánh giá & Phân tích</h4>
                                <div className="bg-gray-50 p-4 rounded-lg prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
                                    {selectedReport.summary ? <p>{selectedReport.summary}</p> : <p>Đang tạo đánh giá...</p>}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-700 text-lg mb-2">Hội thoại</h4>
                                <div className="bg-gray-50 p-3 rounded-lg h-48 overflow-y-auto space-y-2">
                                    {selectedReport.conversation.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'}`}>
                                            <p className={`text-sm px-3 py-1 rounded-2xl ${msg.sender === 'ai' ? 'bg-blue-200 text-gray-800' : 'bg-green-200 text-gray-800'}`}>
                                                {msg.text}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold text-gray-700 text-lg mb-2">Ghi chú tâm lý</h4>
                                <ul className="list-disc list-inside bg-gray-50 p-3 rounded-lg mt-1 space-y-1">
                                   {selectedReport.psychologicalNotes.map((note, i) => <li key={i} className="text-sm text-gray-700">{note}</li>)}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500">Chọn một báo cáo để xem chi tiết.</p>
                        </div>
                    )}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagementScreen;