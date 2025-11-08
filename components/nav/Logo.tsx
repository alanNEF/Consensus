export default function Logo() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="leftCircle">
          <circle cx="35" cy="50" r="30"/>
        </clipPath>
        <clipPath id="rightCircle">
          <circle cx="65" cy="50" r="30"/>
        </clipPath>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {/* Blue circle on the left */}
      <circle cx="35" cy="50" r="30" fill="#0051FF" filter="url(#glow)"/>
      {/* Red circle on the right */}
      <circle cx="65" cy="50" r="30" fill="#FF0000" filter="url(#glow)"/>
      {/* Purple overlap - intersection of both circles */}
      <circle cx="35" cy="50" r="30" fill="#8B5CF6" clipPath="url(#rightCircle)" filter="url(#glow)"/>
    </svg>
  );
}

