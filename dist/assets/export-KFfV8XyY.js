import{c as x}from"./createLucideIcon-WljnV7UJ.js";const b=[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]],m=x("download",b);function v(e,o){if(!o||o.length===0){alert("Aucune donnée à exporter");return}const n=Object.keys(o[0]),i=a=>{if(a==null)return"";const s=String(a).replace(/"/g,'""');return/[",;\n]/.test(s)?`"${s}"`:s},l=[n.join(";"),...o.map(a=>n.map(s=>i(a[s])).join(";"))].join(`
`),d=new Blob(["\uFEFF"+l],{type:"text/csv;charset=utf-8;"});h(d,e.endsWith(".csv")?e:`${e}.csv`)}function y(e){const o=e.sessions.reduce((t,r)=>t+(r.energie_kwh||0),0),n=e.sessions.reduce((t,r)=>t+(r.cout_euro||0),0),i=e.sessions.reduce((t,r)=>t+(r.kilometrage||0),0),l=e.sessions.filter(t=>t.is_domicile),d=l.reduce((t,r)=>t+(r.energie_kwh||0),0),a=l.reduce((t,r)=>t+(r.cout_euro||0),0),s=t=>new Date(t).toLocaleDateString("fr-FR"),u=new Date().toLocaleString("fr-FR"),p=e.vehicule?[e.vehicule.marque,e.vehicule.modele].filter(Boolean).join(" ")+(e.vehicule.immatriculation?` — ${e.vehicule.immatriculation}`:""):"",g=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" />
<title>Justificatif ChargiZ — ${e.collaborateur.prenom} ${e.collaborateur.nom}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; color: #1a1a1a; font-size: 11px; line-height: 1.5; margin: 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 4px solid #225560; margin-bottom: 24px; }
  .header h1 { color: #225560; margin: 0 0 4px; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
  .header .sub { color: #666; font-size: 12px; margin: 0; }
  .brand { text-align: right; }
  .brand .logo { font-size: 28px; font-weight: 900; color: #225560; letter-spacing: -1px; line-height: 1; }
  .brand .logo .accent { background: #DCF763; padding: 0 4px; border-radius: 3px; color: #225560; }
  .brand .tagline { font-size: 9px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
  .infos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .info-card { background: #f5f7f8; border-left: 3px solid #225560; padding: 12px 14px; border-radius: 0 6px 6px 0; }
  .info-card h3 { margin: 0 0 6px; font-size: 10px; color: #225560; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
  .info-card p { margin: 2px 0; font-size: 11px; }
  .info-card strong { color: #225560; }
  .totals-banner { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 20px 0; }
  .total-box { padding: 12px; border-radius: 8px; text-align: center; }
  .total-box.primary { background: #225560; color: white; }
  .total-box.accent { background: #DCF763; color: #225560; }
  .total-box.secondary { background: #f5f7f8; color: #225560; border: 1px solid #e0e4e7; }
  .total-box .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.85; margin-bottom: 4px; }
  .total-box .value { font-size: 20px; font-weight: 800; }
  .total-box .unit { font-size: 11px; font-weight: 600; opacity: 0.9; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #225560; color: white; padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
  th.r, td.r { text-align: right; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 10.5px; }
  tr:nth-child(even) td { background: #fafbfc; }
  .badge-dom { display: inline-block; background: #DCF763; color: #225560; font-size: 9px; padding: 2px 6px; border-radius: 10px; font-weight: 600; margin-left: 4px; }
  .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #666; line-height: 1.6; }
  .footer .signature { margin-top: 20px; display: flex; justify-content: space-between; }
  .footer .sig-block { width: 45%; }
  .footer .sig-line { border-top: 1px solid #999; margin-top: 30px; padding-top: 4px; font-size: 9px; color: #666; text-align: center; }
  @media print { .noprint { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>

<div class="header">
  <div>
    <h1>Justificatif de recharge</h1>
    <p class="sub">Période du <strong>${s(e.periode.from)}</strong> au <strong>${s(e.periode.to)}</strong></p>
  </div>
  <div class="brand">
    <div class="logo">Chargi<span class="accent">Z</span></div>
    <div class="tagline">Recharge VE professionnelle</div>
  </div>
</div>

<div class="infos-grid">
  <div class="info-card">
    <h3>Collaborateur</h3>
    <p><strong>${e.collaborateur.prenom} ${e.collaborateur.nom}</strong></p>
    <p>${e.collaborateur.email}</p>
    ${e.entreprise?.nom?`<p>Entreprise : <strong>${e.entreprise.nom}</strong></p>`:""}
  </div>
  <div class="info-card">
    <h3>Véhicule</h3>
    ${p?`<p><strong>${p}</strong></p>`:'<p style="color:#999;font-style:italic">Aucun véhicule affecté</p>'}
    ${e.vehicule?.vin?`<p style="font-family:monospace;font-size:9.5px">VIN : ${e.vehicule.vin}</p>`:""}
    <p style="color:#666;font-size:9.5px">Document généré le ${u}</p>
  </div>
</div>

<div class="totals-banner">
  <div class="total-box primary">
    <div class="label">Sessions</div>
    <div class="value">${e.sessions.length}</div>
  </div>
  <div class="total-box secondary">
    <div class="label">Énergie totale</div>
    <div class="value">${o.toFixed(1)} <span class="unit">kWh</span></div>
  </div>
  <div class="total-box secondary">
    <div class="label">kWh domicile</div>
    <div class="value">${d.toFixed(1)} <span class="unit">kWh</span></div>
  </div>
  <div class="total-box accent">
    <div class="label">Remboursable</div>
    <div class="value">${a.toFixed(2)} <span class="unit">€</span></div>
  </div>
</div>

<table>
  <thead><tr>
    <th>Date</th>
    <th>Jour</th>
    <th>Lieu</th>
    <th class="r">Km</th>
    <th class="r">Énergie</th>
    <th class="r">Coût</th>
  </tr></thead>
  <tbody>
    ${e.sessions.length===0?'<tr><td colspan="6" style="text-align:center;padding:24px;color:#666;font-style:italic">Aucune session sur cette période</td></tr>':e.sessions.map(t=>`<tr>
        <td>${t.date_debut?s(t.date_debut):"—"}</td>
        <td>${t.jour_semaine||"—"}</td>
        <td>${t.is_domicile?'Domicile<span class="badge-dom">DOM</span>':"Bureau / Public"}</td>
        <td class="r">${t.kilometrage!=null?t.kilometrage.toFixed(1):"—"}</td>
        <td class="r">${(t.energie_kwh||0).toFixed(2)} kWh</td>
        <td class="r">${(t.cout_euro||0).toFixed(2)} €</td>
      </tr>`).join("")}
  </tbody>
  <tfoot>
    <tr style="background:#225560;color:white;font-weight:700">
      <td colspan="3" style="padding:10px 12px">TOTAL GÉNÉRAL</td>
      <td class="r" style="padding:10px 12px">${i.toFixed(1)} km</td>
      <td class="r" style="padding:10px 12px">${o.toFixed(2)} kWh</td>
      <td class="r" style="padding:10px 12px">${n.toFixed(2)} €</td>
    </tr>
  </tfoot>
</table>

<div class="footer">
  <p>Ce justificatif est généré automatiquement par la plateforme <strong>ChargiZ</strong> et atteste des sessions de recharge effectuées par le collaborateur sur le véhicule ci-dessus, durant la période indiquée. Les sessions des autres véhicules ou collaborateurs sont exclues. Document à valeur informative pour remboursement employeur.</p>
  <div class="signature">
    <div class="sig-block">
      <div class="sig-line">Signature du collaborateur</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Signature employeur / RH</div>
    </div>
  </div>
</div>

<script>window.onload = () => { setTimeout(() => window.print(), 300); };<\/script>
</body></html>`,c=window.open("","_blank","width=900,height=700");if(!c){alert("Impossible d'ouvrir la fenêtre d'impression. Autorisez les pop-ups.");return}c.document.write(g),c.document.close()}function h(e,o){const n=URL.createObjectURL(e),i=document.createElement("a");i.href=n,i.download=o,document.body.appendChild(i),i.click(),document.body.removeChild(i),URL.revokeObjectURL(n)}export{m as D,y as a,v as e};
