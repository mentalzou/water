import { useState, useEffect, useRef, useCallback } from 'react';

export interface AdBannerItem {
    id: string;
    type: 'image' | 'video';
    src: string;
    title?: string;
    subtitle?: string;
    link?: string;
    bgColor?: string;
}

interface AdBannerProps {
    ads?: AdBannerItem[];
    autoPlayInterval?: number;
    height?: string;
}

const DEFAULT_ADS: AdBannerItem[] = [
    {
        id: '1',
        type: 'image',
        src: '',
        title: '品质好水 健康到家',
        subtitle: '源自深层岩层 · 富含矿物质',
        bgColor: 'from-sky-400 via-blue-500 to-indigo-600',
    },
    {
        id: '2',
        type: 'image',
        src: '',
        title: '充值钜惠 多充多送',
        subtitle: '充值最高送500元，到账翻倍',
        bgColor: 'from-orange-400 via-red-500 to-pink-500',
    },
    {
        id: '3',
        type: 'image',
        src: '',
        title: '新品上市 限时特价',
        subtitle: '精选好水低至5折起',
        bgColor: 'from-emerald-400 via-green-500 to-teal-600',
    },
];

/** 将后端数据格式转为组件格式 */
function mapBanner(api: any): AdBannerItem {
    return {
        id: api.id,
        type: api.type || 'image',
        src: api.src || '',
        title: api.title || '',
        subtitle: api.subtitle || '',
        link: api.link_url || '',
        bgColor: api.bg_color || '',
    };
}

export default function AdBanner({
                                     ads: externalAds,
                                     autoPlayInterval = 4000,
                                     height = 'h-48',
                                 }: AdBannerProps) {
    const [ads, setAds] = useState<AdBannerItem[]>(externalAds || []);
    const [loading, setLoading] = useState(!externalAds);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const autoPlayTimer = useRef<ReturnType<typeof setInterval>>();
    const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

    // 从后端 API 获取广告栏数据
    useEffect(() => {
        if (externalAds) {
            setAds(externalAds);
            setLoading(false);
            return;
        }
        fetch('/api/banners')
            .then(res => res.json())
            .then(data => {
                if (data.code === 200 && data.data && data.data.length > 0) {
                    setAds(data.data.map(mapBanner));
                } else {
                    setAds(DEFAULT_ADS);
                }
            })
            .catch(() => {
                setAds(DEFAULT_ADS);
            })
            .finally(() => setLoading(false));
    }, [externalAds]);

    const slideCount = ads.length;

    const goToSlide = useCallback((index: number) => {
        if (isTransitioning || slideCount <= 1) return;
        setIsTransitioning(true);
        setCurrentIndex(index);
        setTimeout(() => setIsTransitioning(false), 500);
    }, [isTransitioning, slideCount]);

    const goNext = useCallback(() => {
        const next = (currentIndex + 1) % slideCount;
        goToSlide(next);
    }, [currentIndex, slideCount, goToSlide]);

    const goPrev = useCallback(() => {
        const prev = (currentIndex - 1 + slideCount) % slideCount;
        goToSlide(prev);
    }, [currentIndex, slideCount, goToSlide]);

    useEffect(() => {
        if (slideCount <= 1) return;
        autoPlayTimer.current = setInterval(goNext, autoPlayInterval);
        return () => clearInterval(autoPlayTimer.current);
    }, [goNext, autoPlayInterval, slideCount]);

    useEffect(() => {
        videoRefs.current.forEach((video, id) => {
            const adItem = ads[currentIndex];
            if (adItem && adItem.id === id && adItem.type === 'video') {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, [currentIndex, ads]);

    function handleTouchStart(e: React.TouchEvent) {
        touchStartX.current = e.touches[0].clientX;
        clearInterval(autoPlayTimer.current);
    }

    function handleTouchMove(e: React.TouchEvent) {
        touchEndX.current = e.touches[0].clientX;
    }

    function handleTouchEnd() {
        const delta = touchStartX.current - touchEndX.current;
        if (Math.abs(delta) > 50) {
            if (delta > 0) goNext();
            else goPrev();
        }
        if (slideCount > 1) {
            autoPlayTimer.current = setInterval(goNext, autoPlayInterval);
        }
    }

    function handleClick(ad: AdBannerItem) {
        if (ad.link) {
            window.location.href = ad.link;
        }
    }

    if (loading) return null;
    if (ads.length === 0) return null;

    return (
        <div className={`relative ${height} overflow-hidden`}
             onTouchStart={handleTouchStart}
             onTouchMove={handleTouchMove}
             onTouchEnd={handleTouchEnd}>
            <div
                className="flex h-full transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {ads.map((ad) => (
                    <div
                        key={ad.id}
                        className="min-w-full h-full relative flex-shrink-0 cursor-pointer"
                        onClick={() => handleClick(ad)}
                    >
                        {ad.type === 'video' && ad.src ? (
                            <video
                                ref={(el) => { if (el) videoRefs.current.set(ad.id, el); }}
                                src={ad.src}
                                className="absolute inset-0 w-full h-full object-cover"
                                muted
                                loop
                                playsInline
                                preload="auto"
                            />
                        ) : ad.src ? (
                            <img
                                src={ad.src}
                                alt={ad.title || ''}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        ) : (
                            <div className={`absolute inset-0 bg-gradient-to-br ${ad.bgColor || 'from-water-light via-water to-teal-400'}`}>
                                <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
                                    {ad.title && (
                                        <h2 className="text-2xl font-bold text-white drop-shadow-lg text-center">
                                            {ad.title}
                                        </h2>
                                    )}
                                    {ad.subtitle && (
                                        <p className="text-white/80 text-sm mt-2 drop-shadow-md text-center">
                                            {ad.subtitle}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                    </div>
                ))}
            </div>
            {slideCount > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10">
                    {ads.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                index === currentIndex
                                    ? 'bg-white w-5'
                                    : 'bg-white/50 hover:bg-white/80'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
