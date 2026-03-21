import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, GripVertical, MoreVertical, Pencil, Trash2, X, Bell, Download, Cloud, CloudOff } from 'lucide-react';
import './index.css';
import {
  cloudAvailable,
  signInCloud,
  subscribeToBills,
  saveBillsToCloud,
} from './firebase';

const STORAGE_KEY = 'monthly-bills-v12-custom-drag';
const LAST_NOTIFY_KEY = 'monthly-bills-v12-last-notify';

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
  onDragHandlePointerDown,
  dragEnabled,
  dimmed,
  rowRef,
}) {
  const derived = getDerivedStatus(bill);
  const isPaid = bill.status === 'Paid';

  return (
    <div
      ref={rowRef}
      className={[
        'bill-row',
        isPaid ? 'bill-row-paid' : '',
        dimmed ? 'bill-row-hidden' : '',
      ].join(' ')}
    >
      <button
        type="button"
        className={`drag-col drag-handle ${dragEnabled ? 'drag-enabled' : 'drag-disabled'}`}
        onPointerDown={dragEnabled ? (e) => onDragHandlePointerDown(e, bill.id) : undefined}
        title={dragEnabled ? 'Hold and drag to reorder' : 'Paid items stay at bottom'}
      >
        <GripVertical size={18} />
      </button>

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
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [cloudStatus, setCloudStatus] = useState(cloudAvailable ? 'Connecting...' : 'Local only');
  const [cloudReady, setCloudReady] = useState(false);

  const localUpdateRef = useRef(false);
  const firstRemoteSyncRef = useRef(false);
  const lastSavedJsonRef = useRef('');
  const saveTimerRef = useRef(null);

  const unpaidContainerRef = useRef(null);
  const firstRowRef = useRef(null);

  const [dragState, setDragState] = useState({
    active: false,
    id: null,
    fromIndex: -1,
    toIndex: -1,
    pointerY: 0,
    offsetY: 0,
    rowHeight: 72,
    containerTop: 0,
    containerLeft: 0,
    containerWidth: 0,
  });

  const unpaidBills = useMemo(() => bills.filter((b) => b.status !== 'Paid'), [bills]);
  const paidBills = useMemo(() => bills.filter((b) => b.status === 'Paid'), [bills]);

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
      if (!cloudAvailable) {
        firstRemoteSyncRef.current = true;
        return;
      }

      try {
        const uid = await signInCloud();
        setCloudStatus('Cloud synced');
        setCloudReady(true);

        unsub = subscribeToBills(uid, (remoteBills) => {
          const normalizedRemote = Array.isArray(remoteBills) ? sortBills(remoteBills) : [];
          const remoteJson = JSON.stringify(normalizedRemote);

          if (!firstRemoteSyncRef.current) {
            firstRemoteSyncRef.current = true;
            if (normalizedRemote.length) {
              lastSavedJsonRef.current = remoteJson;
              setBills(normalizedRemote);
            }
            return;
          }

          if (localUpdateRef.current && remoteJson === lastSavedJsonRef.current) {
            localUpdateRef.current = false;
            return;
          }

          setBills((current) => {
            const localJson = JSON.stringify(current);
            if (remoteJson && remoteJson !== localJson) {
              localUpdateRef.current = false;
              lastSavedJsonRef.current = remoteJson;
              return normalizedRemote;
            }
            return current;
          });
        });
      } catch (err) {
        console.log('Cloud init error:', err);
        setCloudStatus('Cloud error');
        setCloudReady(false);
        firstRemoteSyncRef.current = true;
      }
    }

    initCloud();

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  useEffect(() => {
    if (!cloudReady) return;
    if (!firstRemoteSyncRef.current) return;

    const nextJson = JSON.stringify(bills);
    if (nextJson === lastSavedJsonRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      localUpdateRef.current = true;
      lastSavedJsonRef.current = nextJson;

      saveBillsToCloud(bills).catch((err) => {
        console.log('Cloud save error:', err);
        setCloudStatus('Cloud error');
        localUpdateRef.current = false;
      });
    }, 250);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [bills, cloudReady]);

  const alerts = useMemo(() => {
    const late = unpaidBills.filter((b) => daysDiff(b.dueDate) < 0);
    const dueSoon = unpaidBills.filter((b) => {
      const d = daysDiff(b.dueDate);
      return d >= 0 && d <= 3;
    });
    return { late, dueSoon };
  }, [unpaidBills]);

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
    const paid = paidBills.reduce((sum, b) => sum + b.amount, 0);
    const unpaid = unpaidBills.reduce((sum, b) => sum + b.amount, 0);
    return { paid, unpaid };
  }, [paidBills, unpaidBills]);

  const draggingBill = dragState.active
    ? unpaidBills.find((b) => b.id === dragState.id) || null
    : null;

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
    localUpdateRef.current = true;
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
    localUpdateRef.current = true;
    setBills((prev) => prev.filter((b) => b.id !== id));
  }

  function toggleStatus(id) {
    localUpdateRef.current = true;
    setBills((prev) =>
      sortBills(
        prev.map((b) =>
          b.id === id ? { ...b, status: b.status === 'Paid' ? 'Unpaid' : 'Paid' } : b
        )
      )
    );
  }

  function startCustomDrag(e, billId) {
    if (dragState.active) return;

    const fromIndex = unpaidBills.findIndex((b) => b.id === billId);
    if (fromIndex === -1) return;

    const containerRect = unpaidContainerRef.current?.getBoundingClientRect();
    const rowRect = e.currentTarget.closest('.bill-row')?.getBoundingClientRect();
    const measuredHeight = rowRect?.height || firstRowRef.current?.getBoundingClientRect()?.height || 72;

    if (!containerRect || !rowRect) return;

    e.preventDefault();

    setDragState({
      active: true,
      id: billId,
      fromIndex,
      toIndex: fromIndex,
      pointerY: e.clientY,
      offsetY: e.clientY - rowRect.top,
      rowHeight: measuredHeight,
      containerTop: containerRect.top,
      containerLeft: containerRect.left,
      containerWidth: containerRect.width,
    });
  }

  useEffect(() => {
    if (!dragState.active) return;

    function onPointerMove(e) {
      const list = unpaidContainerRef.current;
      if (!list) return;

      const rect = list.getBoundingClientRect();
      const rowHeight = dragState.rowHeight || 72;
      const relativeY = e.clientY - rect.top;
      let nextIndex = Math.floor(relativeY / rowHeight);

      if (nextIndex < 0) nextIndex = 0;
      if (nextIndex > unpaidBills.length - 1) nextIndex = unpaidBills.length - 1;

      setDragState((prev) => ({
        ...prev,
        pointerY: e.clientY,
        containerTop: rect.top,
        containerLeft: rect.left,
        containerWidth: rect.width,
        toIndex: nextIndex,
      }));
    }

    function onPointerUp() {
      setDragState((prev) => {
        if (!prev.active) return prev;

        if (prev.fromIndex !== prev.toIndex && prev.fromIndex >= 0 && prev.toIndex >= 0) {
          localUpdateRef.current = true;
          setBills((current) => {
            const unpaid = current.filter((b) => b.status !== 'Paid');
            const paid = current.filter((b) => b.status === 'Paid');
            const next = [...unpaid];
            const [moved] = next.splice(prev.fromIndex, 1);
            next.splice(prev.toIndex, 0, moved);
            return [...next, ...paid];
          });
        }

        return {
          active: false,
          id: null,
          fromIndex: -1,
          toIndex: -1,
          pointerY: 0,
          offsetY: 0,
          rowHeight: 72,
          containerTop: 0,
          containerLeft: 0,
          containerWidth: 0,
        };
      });
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [dragState.active, dragState.rowHeight, unpaidBills.length]);

  function renderUnpaidRows() {
    const rows = [];
    unpaidBills.forEach((bill, index) => {
      const isDragged = dragState.active && dragState.id === bill.id;

      if (dragState.active && dragState.toIndex === index && dragState.id !== bill.id) {
        rows.push(
          <div
            key={`gap-before-${bill.id}`}
            className="drag-gap"
            style={{ height: `${dragState.rowHeight}px` }}
          />
        );
      }

      rows.push(
        <BillRow
          key={bill.id}
          bill={bill}
          onEdit={openEdit}
          onDelete={deleteBill}
          onToggleStatus={toggleStatus}
          onDragHandlePointerDown={startCustomDrag}
          onDragStart={() => {}}
          onDragEnter={() => {}}
          onDrop={() => {}}
          onDragEnd={() => {}}
          isDragging={false}
          isDropTarget={false}
          dragEnabled={true}
          dimmed={isDragged}
          rowRef={index === 0 ? firstRowRef : null}
        />
      );
    });

    if (dragState.active && dragState.toIndex === unpaidBills.length - 1 && dragState.id === unpaidBills[unpaidBills.length - 1]?.id) {
      rows.push(
        <div
          key="gap-end"
          className="drag-gap"
          style={{ height: `${dragState.rowHeight}px` }}
        />
      );
    }

    return rows;
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
            <div ref={unpaidContainerRef}>
              {renderUnpaidRows()}
            </div>

            {paidBills.map((bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
                onEdit={openEdit}
                onDelete={deleteBill}
                onToggleStatus={toggleStatus}
                onDragHandlePointerDown={() => {}}
                onDragStart={() => {}}
                onDragEnter={() => {}}
                onDrop={() => {}}
                onDragEnd={() => {}}
                isDragging={false}
                isDropTarget={false}
                dragEnabled={false}
                dimmed={false}
                rowRef={null}
              />
            ))}
          </div>
        </div>

        <div className="footer-section">
          <div className="footer-line">Every bill paid is one less worry.</div>
          <div className="footer-divider" />
          <div className="footer-line">One step closer to zero balance.</div>
        </div>

        {draggingBill && (
          <div
            className="drag-floating-card"
            style={{
              top: `${dragState.pointerY - dragState.offsetY}px`,
              left: `${dragState.containerLeft}px`,
              width: `${dragState.containerWidth}px`,
            }}
          >
            <div className="bill-row drag-row-active">
              <div className="drag-col drag-enabled">
                <GripVertical size={18} />
              </div>
              <div className="name-col">{draggingBill.title}</div>
              <div className="amount-col">{peso(draggingBill.amount)}</div>
              <div className="status-col">
                <div className={statusClass(getDerivedStatus(draggingBill))}>
                  {getDerivedStatus(draggingBill)}
                </div>
              </div>
              <div className="menu-col">
                <div className="icon-btn">
                  <MoreVertical size={18} />
                </div>
              </div>
            </div>
          </div>
        )}
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
