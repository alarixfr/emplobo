/**
 * Brain Readiness ring — reference: training_room_ai_knowledge_extraction.
 * 8px-stroke circular progress with a large mono percentage in the center.
 */
export function ReadinessRing({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  // r=40 → circumference = 2πr ≈ 251.2
  const circumference = 251.2;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative inline-flex h-32 w-32 items-center justify-center">
      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
        <circle
          className="text-slate-200"
          cx="50"
          cy="50"
          fill="transparent"
          r="40"
          stroke="currentColor"
          strokeWidth="8"
        />
        <circle
          className="text-primary transition-all duration-1000 ease-in-out"
          cx="50"
          cy="50"
          fill="transparent"
          r="40"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeWidth="8"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-headline-lg text-[32px] font-bold text-primary">
          {clamped}%
        </span>
      </div>
    </div>
  );
}
