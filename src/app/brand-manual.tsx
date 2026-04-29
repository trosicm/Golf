
import { Logo } from "./components/Logo";
import { Card } from "./components/Card";
import { Badge } from "./components/Badge";

export default function BrandManual() {
  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <div className="flex flex-col items-center mb-8">
        <Logo variant="primary" size="lg" className="mb-4 mx-auto" />
        <h1 className="text-3xl font-extrabold mb-2 text-[var(--gr-sand)] text-center">Golf Rivals</h1>
        <Badge variant="gold" className="mb-2">Every Hole Has a Price.</Badge>
        <div className="text-base text-[var(--gr-text-muted)] mb-2 text-center">Play smart. Win the hole.</div>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          <Badge variant="gold">premium</Badge>
          <Badge variant="turf">competitiva</Badge>
          <Badge variant="warning">estratégica</Badge>
          <Badge variant="neutral">clara</Badge>
          <Badge variant="turf">deportiva</Badge>
          <Badge variant="gold">elegante</Badge>
          <Badge variant="neutral">útil en campo</Badge>
        </div>
      </div>

      <Card variant="strong" className="mb-6">
        <h2 className="text-xl font-bold mb-3 text-[var(--gr-gold)]">Paleta oficial</h2>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className="flex items-center gap-3"><span className="inline-block w-6 h-6 rounded-full" style={{background: "#0F2D28"}}></span>Midnight Fairway <span className="ml-auto text-xs">#0F2D28</span></div>
          <div className="flex items-center gap-3"><span className="inline-block w-6 h-6 rounded-full" style={{background: "#181B1E"}}></span>Carbon Black <span className="ml-auto text-xs">#181B1E</span></div>
          <div className="flex items-center gap-3"><span className="inline-block w-6 h-6 rounded-full border" style={{background: "#EFE8DA", borderColor: "#2E3A36"}}></span>Sand White <span className="ml-auto text-xs">#EFE8DA</span></div>
          <div className="flex items-center gap-3"><span className="inline-block w-6 h-6 rounded-full border" style={{background: "#C6A15B", borderColor: "#C6A15B"}}></span>Victory Gold <span className="ml-auto text-xs">#C6A15B</span></div>
          <div className="flex items-center gap-3"><span className="inline-block w-6 h-6 rounded-full border" style={{background: "#5FA36A", borderColor: "#5FA36A"}}></span>Turf Accent <span className="ml-auto text-xs">#5FA36A</span></div>
          <div className="flex items-center gap-3"><span className="inline-block w-6 h-6 rounded-full border" style={{background: "#C95C4A", borderColor: "#C95C4A"}}></span>Danger / Penalty <span className="ml-auto text-xs">#C95C4A</span></div>
          <div className="flex items-center gap-3"><span className="inline-block w-6 h-6 rounded-full border" style={{background: "#D9A441", borderColor: "#D9A441"}}></span>Warning / Carry <span className="ml-auto text-xs">#D9A441</span></div>
          <div className="flex items-center gap-3"><span className="inline-block w-6 h-6 rounded-full border" style={{background: "#2E3A36", borderColor: "#2E3A36"}}></span>Muted Border <span className="ml-auto text-xs">#2E3A36</span></div>
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="text-lg font-bold mb-2 text-[var(--gr-gold)]">Reglas de uso de color</h2>
        <ul className="list-disc pl-5 text-[var(--gr-sand)] text-sm">
          <li><span className="font-semibold text-[var(--gr-gold)]">Gold</span> para dinero, pot, CTA principal y highlights importantes.</li>
          <li><span className="font-semibold text-[var(--gr-turf)]">Turf</span> para live, success, ganador y estados activos.</li>
          <li><span className="font-semibold text-[var(--gr-danger)]">Danger</span> para penalizaciones, errores o balance negativo.</li>
          <li><span className="font-semibold text-[var(--gr-warning)]">Warning</span> para carry, avisos o estados pendientes.</li>
          <li><span className="font-semibold text-[var(--gr-sand)]">Sand</span> para texto principal.</li>
          <li><span className="font-semibold text-[var(--gr-carbon)]">Carbon/Midnight</span> para fondos y cards.</li>
        </ul>
      </Card>

      <Card variant="strong" className="mb-6">
        <h2 className="text-lg font-bold mb-2 text-[var(--gr-gold)]">Qué evitar</h2>
        <ul className="list-disc pl-5 text-[var(--gr-text-muted)] text-sm">
          <li>Look de casino</li>
          <li>Colores neón</li>
          <li>App genérica de fantasy sports</li>
          <li>Club de golf antiguo</li>
          <li>Decoración excesiva</li>
          <li>Texto pequeño difícil de leer en exterior</li>
        </ul>
      </Card>

      <div className="text-xs text-[var(--gr-text-muted)] text-center mt-8">Manual visual de marca Golf Rivals. Última actualización premium.</div>
    </div>
  );
}
