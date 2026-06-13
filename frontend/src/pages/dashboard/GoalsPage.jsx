import { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, Home, Car, GraduationCap, Plane, Gem, Umbrella, Baby, Briefcase, Shield, Plus, Edit2, Trash2, X, Check, TrendingUp, Loader2 } from 'lucide-react';

const ICON_MAP = {
  Target, Home, Car, GraduationCap, Plane, Gem, Umbrella, Baby, Briefcase, Shield,
};

const ICON_OPTIONS = [
  { key: 'Target', label: '🎯' },
  { key: 'Home', label: '🏠' },
  { key: 'Car', label: '🚗' },
  { key: 'GraduationCap', label: '🎓' },
  { key: 'Plane', label: '✈️' },
  { key: 'Gem', label: '💍' },
  { key: 'Umbrella', label: '🏖️' },
  { key: 'Baby', label: '👶' },
  { key: 'Briefcase', label: '💼' },
  { key: 'Shield', label: '🛡️' },
];

const formatCurrency = (v) => `PKR ${Number(v).toLocaleString()}`;

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '', target_pkr: '', current_pkr: '', deadline: '', icon: 'Target', priority: 'medium',
  });

  /* ── Fetch goals on mount ── */
  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/goals', authHeader());
      setGoals(res.data.goals || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  /* ── Create / Update ── */
  const handleSave = async () => {
    if (!form.name || !form.target_pkr) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        target_pkr: Number(form.target_pkr),
        current_pkr: Number(form.current_pkr || 0),
        deadline: form.deadline || null,
        icon: form.icon,
        priority: form.priority,
      };

      if (editId) {
        const res = await axios.put(`/api/goals/${editId}`, payload, authHeader());
        setGoals(prev => prev.map(g => g.id === editId ? res.data.goal : g));
      } else {
        const res = await axios.post('/api/goals', payload, authHeader());
        setGoals(prev => [res.data.goal, ...prev]);
      }
      closeForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/goals/${id}`, authHeader());
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete goal');
    }
  };

  const handleEdit = (goal) => {
    setForm({
      name: goal.name,
      target_pkr: goal.target_pkr,
      current_pkr: goal.current_pkr,
      deadline: goal.deadline || '',
      icon: goal.icon || 'Target',
      priority: goal.priority || 'medium',
    });
    setEditId(goal.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ name: '', target_pkr: '', current_pkr: '', deadline: '', icon: 'Target', priority: 'medium' });
  };

  /* ── Render ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-surface-900 dark:text-white">Financial Goals</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">Track and manage your financial milestones.</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#ccff00] text-slate-900 font-extrabold rounded-2xl shadow-md shadow-[#ccff00]/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          Add Goal
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeForm}>
          <div className="neo-card p-6 w-full max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">{editId ? 'Edit Goal' : 'New Goal'}</h2>
              <button onClick={closeForm} className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Icon picker */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Icon</label>
                <div className="flex gap-2 flex-wrap">
                  {ICON_OPTIONS.map(({ key, label }) => {
                    const IconComp = ICON_MAP[key];
                    return (
                      <button key={key} onClick={() => setForm({ ...form, icon: key })}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${form.icon === key ? 'bg-[#ccff00]/20 ring-2 ring-[#ccff00] text-slate-900 dark:text-[#ccff00]' : 'bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-500'}`}>
                        <IconComp className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Goal Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Dream Home"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder:text-surface-400 focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Target (PKR)</label>
                  <input type="number" value={form.target_pkr} onChange={(e) => setForm({ ...form, target_pkr: e.target.value })} placeholder="1000000"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder:text-surface-400 focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Current (PKR)</label>
                  <input type="number" value={form.current_pkr} onChange={(e) => setForm({ ...form, current_pkr: e.target.value })} placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder:text-surface-400 focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Deadline</label>
                  <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeForm} className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 font-semibold hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#ccff00] text-slate-900 font-bold hover:shadow-lg hover:shadow-[#ccff00]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={3} />}
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && !loading && (
        <div className="neo-card p-12 text-center">
          <Target className="w-12 h-12 text-surface-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300">No goals yet</h3>
          <p className="text-surface-500 text-sm mt-1 mb-6">Set your first financial goal to get started.</p>
          <button onClick={() => setShowForm(true)}
            className="px-6 py-2.5 bg-[#ccff00] text-slate-900 font-bold rounded-xl hover:shadow-lg transition-all">
            Add Your First Goal
          </button>
        </div>
      )}

      {/* Goals grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((goal) => {
          const pct = goal.target_pkr > 0 ? Math.min(100, Math.round((goal.current_pkr / goal.target_pkr) * 100)) : 0;
          const daysLeft = goal.deadline
            ? Math.max(0, Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)))
            : null;
          const GoalIcon = ICON_MAP[goal.icon] || Target;

          return (
            <div key={goal.id} className="neo-card p-6 group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              {/* Priority Accent */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl ${
                goal.priority === 'high' ? 'bg-red-500'
                : goal.priority === 'medium' ? 'bg-amber-500'
                : 'bg-sky-500'
              }`} />

              <div className="flex justify-between items-start mb-6 pl-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm transition-transform group-hover:scale-105">
                    <GoalIcon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{goal.name}</h3>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 capitalize">{goal.priority} Priority</span>
                  </div>
                </div>
                {/* Hover Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(goal)} className="p-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(goal.id)} className="p-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pl-2">
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                  {formatCurrency(goal.current_pkr)}
                </div>
                <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Goal: {formatCurrency(goal.target_pkr)}
                </div>

                {/* Segmented Progress */}
                <div className="mt-6">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Progress</span>
                    <span className="text-[11px] font-extrabold text-[#ccff00] drop-shadow-sm bg-slate-900 px-2.5 py-1 rounded-md tracking-wider">
                      {pct}%
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 20 }).map((_, i) => {
                      const filled = Math.round((pct / 100) * 20);
                      return (
                        <div key={i} className={`h-2 flex-1 rounded-sm transition-all duration-500 ${
                          i < filled ? 'bg-[#ccff00] shadow-[0_0_8px_rgba(204,255,0,0.4)]' : 'bg-slate-100 dark:bg-slate-800'
                        }`} />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center pl-2">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  {daysLeft !== null
                    ? daysLeft > 0 ? `${daysLeft} days remaining` : 'Deadline passed'
                    : 'No deadline'}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-1 rounded-md flex items-center gap-1 border bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20">
                  <TrendingUp className="w-3 h-3" />
                  {pct >= 80 ? 'On Track' : pct >= 40 ? 'In Progress' : 'Just Started'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
