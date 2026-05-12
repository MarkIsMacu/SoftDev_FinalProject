/**
 * Component: SkeletonLoader
 * Renders animated skeleton placeholders while API data is loading.
 */
const SkeletonLoader = ({ width = '100%', height = '1rem', radius = '8px', style = {} }) => (
  <div style={{
    width,
    height,
    borderRadius: radius,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    ...style
  }} />
);

export const SkeletonCard = () => (
  <div className="elite-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <SkeletonLoader height="2.5rem" width="60%" />
    <SkeletonLoader height="1rem" width="40%" />
    <SkeletonLoader height="3rem" width="100%" />
  </div>
);

export const SkeletonRow = () => (
  <tr>
    {[...Array(6)].map((_, i) => (
      <td key={i} style={{ padding: '1.25rem 1rem' }}>
        <SkeletonLoader height="1rem" width={i === 0 ? '80px' : '120px'} />
      </td>
    ))}
  </tr>
);

export default SkeletonLoader;
