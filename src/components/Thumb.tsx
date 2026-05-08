import React from 'react';

interface ThumbProps {
  pal: [string, string];
  h?: number;
  style?: React.CSSProperties;
  className?: string;
  imageUrl?: string;
}

export default function Thumb({ pal, h = 200, style, className, imageUrl }: ThumbProps) {
  const base: React.CSSProperties = {
    width: '100%',
    height: h,
    borderRadius: 'inherit',
    overflow: 'hidden',
    flexShrink: 0,
    ...style,
  };

  if (imageUrl) {
    return (
      <div style={base} className={className}>
        <img
          src={imageUrl}
          alt="Property photo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        ...base,
        background: `linear-gradient(135deg, ${pal[0]} 0%, ${pal[1]} 100%)`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Diamond / cross-hatch pattern overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              rgba(255,255,255,0.07) 0px,
              rgba(255,255,255,0.07) 1px,
              transparent 1px,
              transparent 14px
            ),
            repeating-linear-gradient(
              -45deg,
              rgba(255,255,255,0.07) 0px,
              rgba(255,255,255,0.07) 1px,
              transparent 1px,
              transparent 14px
            )
          `,
        }}
      />
      {/* Label */}
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          fontSize: 12,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          color: 'rgba(255,255,255,0.65)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          userSelect: 'none',
        }}
      >
        property photo
      </span>
    </div>
  );
}
