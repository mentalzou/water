import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, HeadphonesIcon } from 'lucide-react';

export default function CustomerServicePage() {
  const navigate = useNavigate();

  const handleCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-6 px-5">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">我的客服</h1>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          {/* 客服图标 */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-water/10 rounded-full flex items-center justify-center mb-3">
              <HeadphonesIcon className="w-10 h-10 text-water" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">联系客服</h2>
            <p className="text-sm text-gray-400 mt-1">如有任何问题，欢迎致电咨询</p>
          </div>

          <div className="border-t border-gray-100"></div>

          {/* 订水热线 */}
          <div
            onClick={() => handleCall('18005016582')}
            className="flex items-center justify-between p-4 bg-water/5 rounded-xl cursor-pointer active:bg-water/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-water/20 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-water" />
              </div>
              <div>
                <p className="text-xs text-gray-400">订水热线</p>
                <p className="text-lg font-bold text-gray-800">18005016582</p>
              </div>
            </div>
            <div className="w-9 h-9 bg-water text-white rounded-full flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
          </div>

          {/* 服务热线 */}
          {/*<div*/}
          {/*  onClick={() => handleCall('059088889999')}*/}
          {/*  className="flex items-center justify-between p-4 bg-orange-50 rounded-xl cursor-pointer active:bg-orange-100 transition-colors"*/}
          {/*>*/}
          {/*  <div className="flex items-center gap-3">*/}
          {/*    <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center">*/}
          {/*      <Phone className="w-5 h-5 text-orange-600" />*/}
          {/*    </div>*/}
          {/*    <div>*/}
          {/*      <p className="text-xs text-gray-400">服务热线</p>*/}
          {/*      <p className="text-lg font-bold text-gray-800">0590-88889999</p>*/}
          {/*    </div>*/}
          {/*  </div>*/}
          {/*  <div className="w-9 h-9 bg-orange-500 text-white rounded-full flex items-center justify-center">*/}
          {/*    <Phone className="w-4 h-4" />*/}
          {/*  </div>*/}
          {/*</div>*/}

          <div className="border-t border-gray-100 pt-4">
            <p className="text-center text-xs text-gray-400">
              服务时间：周一至周日 8:30-17:30
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
