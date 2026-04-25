import Image from 'next/image';

export default function BrandManual() {
  return (
    <div className="brand-manual">
      <h1 className="text-3xl font-bold mb-4">Golfrivals Brand Manual</h1>
      <Image src="/brand-logo.svg" alt="Golfrivals Logo" width={180} height={48} className="mb-6" />
      <h2 className="text-xl font-semibold mt-6 mb-2">Brand Colors</h2>
      <ul className="mb-4">
        <li><span className="team-badge team-1">Team 1</span> #1db954</li>
        <li><span className="team-badge team-2">Team 2</span> #3b82f6</li>
        <li><span className="team-badge team-3">Team 3</span> #ffd700</li>
        <li><span className="team-badge team-4">Team 4</span> #a259ff</li>
        <li><span className="inline-block w-6 h-6 rounded-full align-middle mr-2" style={{background: 'linear-gradient(135deg, #181c1f 0%, #23243a 100%)'}}></span>Background</li>
      </ul>
      <h2 className="text-xl font-semibold mt-6 mb-2">Typography</h2>
      <p className="mb-4">Font: Geist, Inter, Arial, Helvetica, sans-serif<br/>Weight: 700 for headings/buttons, 400-600 for body<br/>Color: #fff (on dark), #181c1f (on gold)</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">Logo</h2>
      <p className="mb-4">SVG: <code>/public/brand-logo.svg</code><br/>Usage: Always centered, 180px wide, drop-shadow</p>
      <h2 className="text-xl font-semibold mt-6 mb-2">UI Principles</h2>
      <ul className="mb-4">
        <li>Each team uses its exclusive color for badges, buttons, and scoreboard</li>
        <li>Cards use glassy dark backgrounds with strong contrast</li>
        <li>Buttons are bold, rounded, and use team/brand colors</li>
        <li>Scoreboard and key stats use color for clarity and hierarchy</li>
      </ul>
      <hr className="my-6 border-gray-700" />
      <p className="text-xs text-gray-400">_This is the base for a full brand manual. Expand with more details as needed._</p>
    </div>
  );
}
