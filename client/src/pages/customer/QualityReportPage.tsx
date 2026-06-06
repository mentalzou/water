import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const CERTIFICATES = [
  { name: '产品碳足迹证书',   file: '产品碳足迹证书.pdf' },
  { name: '体系认证证书',     file: '体系认证证书.pdf' },
  { name: '取水证',           file: '取水证.pdf' },
  { name: '工业产品生产许可证', file: '工业产品生产许可证.pdf' },
  { name: '新采矿证',         file: '新采矿证.pdf' },
  { name: '食品生产许可证',   file: '食品生产许可证.pdf' },
];

export default function QualityReportPage() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const toggleExpand = useCallback((index: number) => {
    const willOpen = expanded !== index;
    setExpanded(willOpen ? index : null);

    if (willOpen) {
      setLoading(index);
      // 展开后等一帧再滚动，避免布局抖动
      requestAnimationFrame(() => {
        cardRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, [expanded]);

  const getPdfUrl = (file: string) =>
    `${import.meta.env.VITE_API_BASE || ''}/uploads/quality/${encodeURIComponent(file)}#toolbar=0&navpanes=0&scrollbar=0`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-6 px-5">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">资质证书</h1>
        </div>
        <p className="text-white/70 text-sm mt-1 px-1">共 {CERTIFICATES.length} 项证书</p>
      </header>

      {/* Content */}
      <main className="px-4 py-6 pb-10">
        <div className="grid gap-4">
          {CERTIFICATES.map((cert, index) => {
            const isOpen = expanded === index;
            const isLoading = loading === index;
            return (
              <div
                key={cert.file}
                ref={(el) => { cardRefs.current[index] = el; }}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                {/* 证书标题栏 */}
                <button
                  onClick={() => toggleExpand(index)}
                  className="w-full p-5 flex items-center gap-4 active:bg-gray-50 transition-colors"
                >
                  <div className="w-11 h-11 bg-water/10 rounded-xl flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-water" />
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="text-gray-800 font-semibold text-sm leading-tight">
                      {cert.name}
                    </h3>
                  </div>

                  {isOpen
                    ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
                    : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                  }
                </button>

                {/* 证书图片预览（固定高度容器，避免加载时抖动） */}
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    height: isOpen ? 'calc(100vw * 1.414)' : '0px',
                    maxHeight: isOpen ? '80vh' : '0px',
                  }}
                >
                  <div className="relative w-full h-full">
                    {/* 加载中 */}
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                        <Loader2 className="w-8 h-8 text-water animate-spin" />
                      </div>
                    )}
                    {/* PDF 内嵌展示 */}
                    {isOpen && (
                      <iframe
                        src={getPdfUrl(cert.file)}
                        className="w-full h-full border-0"
                        title={cert.name}
                        sandbox="allow-scripts allow-same-origin"
                        onLoad={() => setLoading(null)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
