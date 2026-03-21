import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, GripVertical, MoreVertical, Pencil, Trash2, X, Bell, Download, Cloud, CloudOff } from 'lucide-react';
import './index.css';
import {
  cloudAvailable,
  signInCloud,
  subscribeToBills,
  saveBillsToCloud,
} from './firebase';

const STORAGE_KEY = 'monthly-bills-v11-cloud-sync';
const LAST_NOTIFY_KEY = 'monthly-bills-v11-last-notify';

const initialBills = [
  { id: 1, title: 'Kuryente', amount: 600, dueDate: '2026-03-26', status: 'Unpaid' },
  { id: 2, title: 'Paylater', amount: 1296, dueDate: '2026-03-21', status: 'Unpaid' },
  { id: 3, title: 'Wifey', amount: 4000, dueDate: '2026-03-18', status: 'Unpaid' },
  { id: 4, title: 'Paluwagan', amount: 2500, dueDate: '2026-03-28', status: 'Unpaid' },
  { id: 5, title: 'Wifi', amount: 1000, dueDate: '2026-03-29', status: 'Unpaid' },
  { id: 6, title: 'Netflix', amount: 295, dueDate: '2026-03-10', status: 'Paid' },
  { id: 7, title: 'Spotify', amount: 149, dueDate: '2026-03-08', status: 'Paid' },
];

function peso(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function daysDiff(dateString) {
  const due = new Date(dateString);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function getDerivedStatus(bill) {
  if (bill.status === 'Paid') return 'Paid';
  const diff = daysDiff(bill.dueDate);
  if (diff < 0) return 'Late';
  if (diff <= 5) return 'Due';
  return 'Unpaid';
}

function statusClass(status) {
  switch (status) {
    case 'Paid': return 'pill pill-paid';
    case 'Due': return 'pill pill-due';
    case 'Late': return 'pill pill-late';
    default: return 'pill pill-unpaid';
  }
}

function sortBills(items) {
  const unpaid = items.filter((b) => b.status !== 'Paid');
  const paid = items.filter((b) => b.status === 'Paid');
  return [...unpaid, ...paid];
}

function useClickOutside(ref, onClose) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [ref, onClose]);
}

function safeNotify(title, options = {}) {
  try {
    if (typeof window === 'undefined') return false;
    if (!('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;
    new Notification(title, options);
    return true;
  } catch (err) {
    console.log('Notification error:', err);
    return false;
  }
}

function BillModal({ open, onClose, onSave, editingBill }) {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    dueDate: '',
    status: 'Unpaid',
  });

  useEffect(() => {
    if (editingBill) {
      setForm({
        title: editingBill.title || '',
        amount: String(editingBill.amount || ''),
        dueDate: editingBill.dueDate || '',
        status: editingBill.status || 'Unpaid',
      });
    } else {
      setForm({
        title: '',
        amount: '',
        dueDate: '',
        status: 'Unpaid',
      });
    }
  }, [editingBill, open]);

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.amount || !form.dueDate) return;
    onSave({
      title: form.title.trim(),
      amount: Number(form.amount),
      dueDate: form.dueDate,
      status: form.status,
    });
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">{editingBill ? 'Edit Bill' : 'Add New Bill'}</div>
          <button className="icon-btn touch-btn" onClick={onClose} type="button" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            <span>Bill Name</span>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Kuryente"
            />
          </label>

          <label>
            <span>Amount</span>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              placeholder="e.g. 600"
            />
          </label>

          <label>
            <span>Due Date</span>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
            />
          </label>

          <label>
            <span>Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            >
              <option>Unpaid</option>
              <option>Paid</option>
            </select>
          </label>

          <div className="modal-actions">
            <button className="secondary-btn touch-btn" type="button" onClick={onClose}>Cancel</button>
            <button className="primary-btn touch-btn" type="submit">{editingBill ? 'Save Changes' : 'Add Bill'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RowMenu({ onEdit, onDelete }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="icon-btn touch-btn" onClick={() => setOpen((v) => !v)} type="button" aria-label="More options">
        <MoreVertical size={18} />
      </button>

      {open && (
        <div className="menu-card">
          <button onClick={() => { onEdit(); setOpen(false); }} type="button">
            <Pencil size={16} />
            Edit
          </button>
          <button className="danger-item" onClick={() => { onDelete(); setOpen(false); }} type="button">
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function BillRow({
  bill,
  onEdit,
  onDelete,
  onToggleStatus,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
  isDragging,
  isDropTarget,
}) {
  const derived = getDerivedStatus(bill);
  const isPaid = bill.status === 'Paid';

  const isTouchDevice =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(pointer: coarse)').matches;

  const canDrag = !isPaid && !isTouchDevice;

  return (
    <div
      className={[
        'bill-row',
        isPaid ? 'bill-row-paid' : '',
        isDragging ? 'bill-row-dragging' : '',
        isDropTarget ? 'bill-row-target' : '',
      ].join(' ')}
      onDragOver={(e) => {
        if (!isPaid) e.preventDefault();
      }}
      onDragEnter={() => {
        if (!isPaid) onDragEnter(bill.id);
      }}
      onDrop={(e) => {
        if (!isPaid) {
          e.preventDefault();
          onDrop(bill.id);
        }
      }}
    >
      <div
        className={`drag-col ${canDrag ? 'drag-enabled' : 'drag-disabled'}`}
        draggable={canDrag}
        onDragStart={() => canDrag && onDragStart(bill.id)}
        onDragEnd={onDragEnd}
        title={canDrag ? 'Drag to prioritize' : 'Paid items stay at bottom'}
      >
        <GripVertical size={18} />
      </div>

      <div className="name-col" title={bill.title}>{bill.title}</div>
      <div className="amount-col">{peso(bill.amount)}</div>

      <div className="status-col">
        <button
          type="button"
          className={statusClass(derived)}
          onClick={() => onToggleStatus(bill.id)}
          title="Tap to toggle paid/unpaid"
        >
          {derived}
        </button>
      </div>

      <div className="menu-col">
        <RowMenu onEdit={() => onEdit(bill)} onDelete={() => onDelete(bill.id)} />
      </div>
    </div>
  );
}

export default function App() {
  const [bills, setBills] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? sortBills(JSON.parse(saved)) : sortBills(initialBills);
    } catch {
      return sortBills(initialBills);
    }
  });

  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [cloudStatus, setCloudStatus] = useState(cloudAvailable ? 'Connecting...' : 'Local only');
  const [cloudReady, setCloudReady] = useState(false);
  const cloudLoadedRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallAvailable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    function installed() {
      setInstallAvailable(false);
      setDeferredPrompt(null);
    }
    window.addEventListener('appinstalled', installed);
    return () => window.removeEventListener('appinstalled', installed);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
    }
  }, []);

  useEffect(() => {
    let unsub = null;
    async function initCloud() {
      if (!cloudAvailable) return;

      try {
        const uid = await signInCloud();
        setCloudStatus('Cloud synced');
        setCloudReady(true);
        unsub = subscribeToBills(uid, (remoteBills) => {
          if (Array.isArray(remoteBills) && remoteBills.length) {
            setBills(sortBills(remoteBills));
          }
          cloudLoadedRef.current = true;
        });
      } catch (err) {
        setCloudStatus('Cloud error');
        setCloudReady(false);
        cloudLoadedRef.current = true;
      }
    }
    initCloud();

    if (!cloudAvailable) {
      cloudLoadedRef.current = true;
    }

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  useEffect(() => {
    if (!cloudReady) return;
    if (!cloudLoadedRef.current) return;
    saveBillsToCloud(bills).catch(() => setCloudStatus('Cloud error'));
  }, [bills, cloudReady]);

  const alerts = useMemo(() => {
    const unpaid = bills.filter((b) => b.status !== 'Paid');
    const late = unpaid.filter((b) => daysDiff(b.dueDate) < 0);
    const dueSoon = unpaid.filter((b) => {
      const d = daysDiff(b.dueDate);
      return d >= 0 && d <= 3;
    });
    return { late, dueSoon };
  }, [bills]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const todayKey = new Date().toISOString().slice(0, 10);
      const lastKey = localStorage.getItem(LAST_NOTIFY_KEY);
      if (lastKey === todayKey) return;

      const messages = [];
      if (alerts.late.length) {
        messages.push(`${alerts.late.length} overdue bill${alerts.late.length > 1 ? 's' : ''} need attention.`);
      }
      if (alerts.dueSoon.length) {
        messages.push(`${alerts.dueSoon.length} bill${alerts.dueSoon.length > 1 ? 's are' : ' is'} due soon.`);
      }

      if (messages.length) {
        const shown = safeNotify('Monthly Bills Reminder', {
          body: messages.join(' '),
          icon: '/icon-192.svg',
          badge: '/icon-192.svg',
        });

        if (shown) {
          localStorage.setItem(LAST_NOTIFY_KEY, todayKey);
        }
      }
    } catch (err) {
      console.log('Daily alert effect error:', err);
    }
  }, [alerts]);

  const totals = useMemo(() => {
    const paid = bills.filter((b) => b.status === 'Paid').reduce((sum, b) => sum + b.amount, 0);
    const unpaid = bills.filter((b) => b.status !== 'Paid').reduce((sum, b) => sum + b.amount, 0);
    return { paid, unpaid };
  }, [bills]);

  async function enableNotifications() {
    try {
      if (typeof window === 'undefined') return;
      if (!('Notification' in window)) {
        alert('Notifications are not supported on this device/browser.');
        return;
      }

      if (Notification.permission === 'granted') {
        setNotificationPermission('granted');
        safeNotify('Notifications already enabled', {
          body: 'You will continue getting reminders for due soon and overdue bills.',
          icon: '/icon-192.svg',
        });
        return;
      }

      const result = await Notification.requestPermission();
      setNotificationPermission(result);

      if (result === 'granted') {
        safeNotify('Notifications enabled', {
          body: 'You will get reminders for due soon and overdue bills.',
          icon: '/icon-192.svg',
        });
      }
    } catch (err) {
      console.log('Enable notifications error:', err);
      setNotificationPermission('default');
    }
  }

  async function installApp() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
    setInstallAvailable(false);
  }

  function openAdd() {
    setEditingBill(null);
    setShowModal(true);
  }

  function openEdit(bill) {
    setEditingBill(bill);
    setShowModal(true);
  }

  function saveBill(data) {
    if (editingBill) {
      setBills((prev) =>
        sortBills(prev.map((b) => (b.id === editingBill.id ? { ...b, ...data } : b)))
      );
    } else {
      const newBill = { id: Date.now(), ...data };
      setBills((prev) => sortBills([...prev, newBill]));
    }
    setShowModal(false);
    setEditingBill(null);
  }

  function deleteBill(id) {
    setBills((prev) => prev.filter((b) => b.id !== id));
  }

  function toggleStatus(id) {
    setBills((prev) =>
      sortBills(
        prev.map((b) =>
          b.id === id ? { ...b, status: b.status === 'Paid' ? 'Unpaid' : 'Paid' } : b
        )
      )
    );
  }

  function handleDragStart(id) {
    setDraggedId(id);
    setDragOverId(id);
  }

  function handleDragEnter(id) {
    setDragOverId(id);
  }

  function handleDrop(targetId) {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    setBills((prev) => {
      const unpaid = prev.filter((b) => b.status !== 'Paid');
      const paid = prev.filter((b) => b.status === 'Paid');
      const fromIndex = unpaid.findIndex((b) => b.id === draggedId);
      const toIndex = unpaid.findIndex((b) => b.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const next = [...unpaid];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return [...next, ...paid];
    });

    setDraggedId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
  }

  return (
    <div className="app-shell">
      <div className="phone-card">
        <div className="top-section">
          <div className="top-actions">
            <button className="add-btn touch-btn" type="button" onClick={openAdd} aria-label="Add bill">
              <Plus size={22} />
            </button>
          </div>

          <h1 className="title">Monthly Bills</h1>
          <div className="quote-top">Pay today, stress less tomorrow.</div>

          <div className="utility-row">
            <button className="mini-btn touch-btn" type="button" onClick={enableNotifications}>
              <Bell size={15} />
              {notificationPermission === 'granted' ? 'Alerts On' : 'Enable Alerts'}
            </button>
            {installAvailable ? (
              <button className="mini-btn touch-btn" type="button" onClick={installApp}>
                <Download size={15} />
                Install App
              </button>
            ) : null}
            <div className="mini-chip" title={cloudAvailable ? 'Cloud sync ready after Firebase setup' : 'Needs Firebase config'}>
              {cloudAvailable ? <Cloud size={15} /> : <CloudOff size={15} />}
              {cloudStatus}
            </div>
          </div>

          {(alerts.late.length || alerts.dueSoon.length) ? (
            <div className="alert-strip">
              {alerts.late.length ? <span>{alerts.late.length} overdue</span> : null}
              {alerts.late.length && alerts.dueSoon.length ? <span className="dot-sep">•</span> : null}
              {alerts.dueSoon.length ? <span>{alerts.dueSoon.length} due soon</span> : null}
            </div>
          ) : null}

          <div className="summary-strip">
            <div className="summary-inline summary-inline-paid">
              <span className="summary-inline-label">Paid</span>
              <span className="summary-inline-value">{peso(totals.paid)}</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-inline summary-inline-unpaid">
              <span className="summary-inline-label">Unpaid</span>
              <span className="summary-inline-value">{peso(totals.unpaid)}</span>
            </div>
          </div>
        </div>

        <div className="list-wrap">
          <div className="list-card">
            {bills.map((bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
                onEdit={openEdit}
                onDelete={deleteBill}
                onToggleStatus={toggleStatus}
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnter}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                isDragging={draggedId === bill.id}
                isDropTarget={dragOverId === bill.id && draggedId && draggedId !== bill.id}
              />
            ))}
          </div>
        </div>

        <div className="footer-section">
          <div className="footer-line">Every bill paid is one less worry.</div>
          <div className="footer-divider" />
          <div className="footer-line">One step closer to zero balance.</div>
        </div>
      </div>

      <BillModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingBill(null);
        }}
        onSave={saveBill}
        editingBill={editingBill}
      />
    </div>
  );
}
