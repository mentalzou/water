import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, ChevronDown, ChevronUp } from 'lucide-react';

const CERTIFICATES = [
  { name: '产品碳足迹证书',   files: ['cptzjzs_01.jpg', 'cptzjzs_02.jpg'] },
  { name: '体系认证证书',     files: ['txrzzs_01.jpg', 'txrzzs_02.jpg'] },
  { name: '取水证',           files: ['qsz_01.jpg'] },
  { name: '工业产品生产许可证', files: ['gycpscxkz_01.jpg'] },
  { name: '新采矿证',         files: ['xckz_01.jpg'] },
  { name: '食品生产许可证',   files: ['spscxkz_01.jpg'] },
];

export default function QualityReportPage() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpanded(expanded === index ? null : index);
  };

  const getImgUrl = (file: string) =>
    `${import.meta.env.VITE_API_BASE || ''}/uploads/quality/${encodeURIComponent(file)}`;

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
        {/*<p className="text-white/70 text-sm mt-1 px-1">共 {CERTIFICATES.length} 项证书</p>*/}
      </header>

      {/* Content */}
      <main className="px-4 py-6 pb-10">
        <div className="grid gap-4">
          {CERTIFICATES.map((cert, index) => {
            const isOpen = expanded === index;
            const pageCount = cert.files.length;
            return (
              <div key={index} className="bg-white rounded-2xl shadow-sm overflow-hidden">
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
                    {pageCount > 1 && (
                      <p className="text-gray-400 text-xs mt-0.5">共 {pageCount} 页</p>
                    )}
                  </div>

                  {isOpen
                    ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
                    : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                  }
                </button>

                {/* 证书图片展示 */}
                <div
                  className="grid transition-all duration-300 ease-in-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    {cert.files.map((file, i) => (
                      <div key={file} className="relative">
                        {pageCount > 1 && (
                          <span className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full z-10">
                            {i + 1}/{pageCount}
                          </span>
                        )}
                        <img
                          src={getImgUrl(file)}
                          alt={`${cert.name} 第${i + 1}页`}
                          className="w-full block"
                          loading="lazy"
                        />
                        {/* 图片间距，非最后一张 */}
                        {i < pageCount - 1 && <div className="h-1 bg-gray-100" />}
                      </div>
                    ))}
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
