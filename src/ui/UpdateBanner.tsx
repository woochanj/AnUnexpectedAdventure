// 새 버전 알림: 몇 분마다(그리고 앱으로 돌아올 때마다) 서버의 index.html을 캐시 없이 받아,
// 지금 실행 중인 스크립트와 다른 버전이면 "새로고침" 버튼을 띄운다. 세이브는 localStorage라 그대로 남는다.
import { useEffect, useState } from 'react';

const CHECK_EVERY = 3 * 60 * 1000;
const SCRIPT_RE = /assets\/index-[\w-]+\.js/;

/** 지금 페이지가 불러온 메인 스크립트 이름 */
function currentScript(): string | null {
    for (const s of Array.from(document.scripts)) {
        const m = s.src.match(SCRIPT_RE);
        if (m) return m[0];
    }
    return null;
}

export function UpdateBanner() {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // 개발 서버에서는 확인하지 않는다
        if (import.meta.env.DEV) return;
        const mine = currentScript();
        if (!mine) return;
        let stop = false;
        const check = async () => {
            if (stop || document.visibilityState === 'hidden') return;
            try {
                const res = await fetch(`${import.meta.env.BASE_URL}index.html?v=${Date.now()}`, { cache: 'no-store' });
                if (!res.ok) return;
                const latest = (await res.text()).match(SCRIPT_RE)?.[0];
                if (latest && latest !== mine) setReady(true);
            } catch {
                /* 오프라인 등은 무시 */
            }
        };
        const t = window.setInterval(check, CHECK_EVERY);
        const onVisible = () => document.visibilityState === 'visible' && check();
        document.addEventListener('visibilitychange', onVisible);
        window.setTimeout(check, 15000);
        return () => {
            stop = true;
            clearInterval(t);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    if (!ready) return null;
    return (
        <div className="update-banner" role="status">
            <span>새 버전이 있어요</span>
            <button className="btn btn-small btn-primary" onClick={() => window.location.reload()}>
                새로고침
            </button>
            <button className="update-close" aria-label="닫기" onClick={() => setReady(false)}>
                ✕
            </button>
        </div>
    );
}
