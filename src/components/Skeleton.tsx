interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  return (
    <div className="skeleton-shimmer" style={{ width, height, borderRadius, ...style }} />
  );
}

export function CardSkeleton() {
  return (
    <div style={{ background: 'white', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--lav-100)' }}>
      <Skeleton height={180} borderRadius={0} />
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton height={20} width="70%" />
        <Skeleton height={14} width="45%" />
        <Skeleton height={14} width="90%" />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Skeleton height={28} width={64} borderRadius={99} />
          <Skeleton height={28} width={64} borderRadius={99} />
        </div>
      </div>
    </div>
  );
}

export default function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}
