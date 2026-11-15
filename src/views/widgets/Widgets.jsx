import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCell } from "../../controllers/CellController.jsx";
import { useNotifications } from "../../controllers/NotificationController.jsx";
import { daysUntil, serviceDue } from "../../models/equipment.js";
import { CATEGORY_LABEL } from "../../models/historian.js";
import { formatTime } from "../../models/job.js";
import { getStock } from "../../services/mesService.js";
import { Modal } from "../components/overlays.jsx";
import { AiBadge, Button, Card, Field, Input, StatusLamp, Tag } from "../components/primitives.jsx";
import { Icon } from "../components/Icon.jsx";

export function EquipmentWidget() {
  const { state } = useCell();
  const due = serviceDue(state.equipment);
  return (
    <Card title="Robots & sensors" icon="robot">
      <ul className="equip-list">
        {state.equipment.map((e) => (
          <li key={e.id}>
            <span><strong>{e.name}</strong><small>{e.model}</small></span>
            <StatusLamp status={e.status} />
          </li>
        ))}
      </ul>
      {due.map((e) => (
        <div key={e.id} className="callout callout-warning">
          <Icon name="wrench" />
          <div><strong>Check-up due: {e.name}</strong><p>{daysUntil(e.nextServiceDue) <= 0 ? "Due today." : `In ${daysUntil(e.nextServiceDue)} days.`} Tell maintenance when you have a moment.</p></div>
        </div>
      ))}
    </Card>
  );
}

const SIGNALS = [
  { key: "voltage", label: "Voltage", unit: "V" },
  { key: "current", label: "Current", unit: "A" },
  { key: "wireFeed", label: "Wire feed", unit: "m/min" },
  { key: "travelSpeed", label: "Torch speed", unit: "mm/s" },
];

export function TelemetryWidget() {
  const { state } = useCell();
  const t = state.telemetry;
  const welding = t.current > 0;
  return (
    <Card title="Weld signals" icon="eye" actions={<Tag tone={welding ? "positive" : "neutral"}>{welding ? "Arc on" : "Arc off"}</Tag>}>
      <dl className="signals">
        {SIGNALS.map((s) => (
          <div key={s.key} className="signal"><dt>{s.label}</dt><dd><span className="big-num">{welding ? t[s.key] : "—"}</span> {s.unit}</dd></div>
        ))}
        <div className="signal signal-ai"><dt>Predicted penetration <AiBadge /></dt><dd><span className="big-num">{welding ? Math.round(t.penetration) : "—"}</span> %</dd></div>
      </dl>
    </Card>
  );
}

export function HistorianWidget() {
  const { state } = useCell();
  return (
    <Card title="Latest events" icon="history" actions={<Link to="/historian" className="link">Full log</Link>}>
      {state.log.length === 0 ? <p className="empty">No events yet.</p> : (
        <ul className="event-mini">
          {state.log.slice(0, 6).map((e) => (
            <li key={e.id} className={`ev ev-${e.category}`}>
              <time>{formatTime(e.at)}</time>
              <span className="ev-cat">{CATEGORY_LABEL[e.category]}</span>
              <span>{e.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function StockWidget() {
  const { actions } = useCell();
  const { push } = useNotifications();
  const [stock, setStock] = useState([]);
  const [order, setOrder] = useState(null);
  useEffect(() => { getStock().then(setStock); }, []);

  function submit(e) {
    e.preventDefault();
    actions.log(`Material order: ${order.amount} ${order.unit} of ${order.type} (${order.quality}).`, { order });
    push({ tone: "info", title: "Order sent", body: `${order.amount} ${order.unit} of ${order.type} requested.` });
    setOrder(null);
  }

  return (
    <Card title="Material stock" icon="box" actions={<Button variant="ghost" size="sm" onClick={() => setOrder({ type: "", quality: "", amount: 1, unit: "pcs" })}>Order material</Button>}>
      <ul className="stock-list">
        {stock.map((m) => {
          const low = m.amount <= m.min;
          return (
            <li key={m.id} className={low ? "is-low" : ""}>
              <span><strong>{m.type}</strong><small>{m.quality}</small></span>
              <span className="stock-amount">{m.amount} {m.unit}</span>
              {low ? <Button variant="accent" size="sm" onClick={() => setOrder({ ...m, amount: m.min * 2 })}>Order</Button> : <Tag tone="positive">OK</Tag>}
            </li>
          );
        })}
      </ul>
      <Modal open={!!order} title="Order material" onClose={() => setOrder(null)}
        footer={<><Button variant="ghost" onClick={() => setOrder(null)}>Cancel</Button><Button variant="accent" type="submit" form="order-form">Send order</Button></>}>
        {order && (
          <form id="order-form" className="stack" onSubmit={submit}>
            <Field label="Type" id="o-type"><Input id="o-type" value={order.type} onChange={(e) => setOrder({ ...order, type: e.target.value })} required /></Field>
            <Field label="Quality / grade" id="o-q"><Input id="o-q" value={order.quality} onChange={(e) => setOrder({ ...order, quality: e.target.value })} required /></Field>
            <Field label={`Amount (${order.unit})`} id="o-a"><Input id="o-a" type="number" min={1} value={order.amount} onChange={(e) => setOrder({ ...order, amount: e.target.value })} required /></Field>
          </form>
        )}
      </Modal>
    </Card>
  );
}

export function LabelingWidget() {
  return (
    <Card title="Teach the defect finder" icon="tag" actions={<AiBadge />}>
      <p>Look at weld images the AI was unsure about and mark the defects. This makes the AI better over time.</p>
      <Link to="/labeling" className="btn btn-ghost btn-md"><span>Open labelling</span></Link>
    </Card>
  );
}
