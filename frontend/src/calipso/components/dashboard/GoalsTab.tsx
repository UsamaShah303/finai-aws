import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, X, Target, Settings, Car, Building2, Plane,
  GraduationCap, HeartPulse, TrendingUp, Sparkles, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip
} from 'recharts';

// ── Modals ────────────────────────────────────────────────────────────────────

const GoalModal = ({ isOpen, onClose, onSubmit, goalToEdit }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    target_pkr: '',
    deadline: '',
    icon: 'Target',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (goalToEdit) {
      setFormData({
        name: goalToEdit.name || '',
        target_pkr: goalToEdit.target_pkr || '',
        deadline: goalToEdit.deadline || '',
        icon: goalToEdit.icon || 'Target',
        priority: goalToEdit.priority || 'medium'
      });
    } else {
      setFormData({ name: '', target_pkr: '', deadline: '', icon: 'Target', priority: 'medium' });
    }
  }, [goalToEdit, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-white rounded-[40px] p-10 shadow-2xl flex flex-col gap-6"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900">{goalToEdit ? 'Edit Goal' : 'Create New Goal'}</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Goal Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="e.g. New Car"
            />
          </div>
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Target Amount (PKR)</label>
            <input
              type="number"
              value={formData.target_pkr}
              onChange={e => setFormData({ ...formData, target_pkr: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="500000"
            />
          </div>
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Deadline</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={e => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Icon Category</label>
            <select
              value={formData.icon}
              onChange={e => setFormData({ ...formData, icon: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="Target">Target</option>
              <option value="Car">Car</option>
              <option value="Building2">House</option>
              <option value="Plane">Vacation</option>
              <option value="GraduationCap">Education</option>
              <option value="HeartPulse">Health</option>
            </select>
          </div>
        </div>

        <button
          onClick={async () => {
            setLoading(true);
            await onSubmit(formData);
            setLoading(false);
          }}
          disabled={loading || !formData.name || !formData.target_pkr}
          className="w-full mt-4 py-4 bg-primary text-white rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Goal'}
        </button>
      </motion.div>
    </div>
  );
};

const AdjustSavingsModal = ({ isOpen, onClose, onSubmit, goalToEdit }: any) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !goalToEdit) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-white rounded-[40px] p-10 shadow-2xl flex flex-col gap-6"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900">Add Savings</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
          <p className="text-sm font-bold text-gray-900">Goal: {goalToEdit.name}</p>
          <p className="text-xs text-gray-500 font-medium">Target: PKR {Number(goalToEdit.target_pkr).toLocaleString()}</p>
        </div>

        <div>
          <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Amount to Add (PKR)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-xl text-center"
            placeholder="e.g. 5000"
          />
        </div>

        <button
          onClick={async () => {
            setLoading(true);
            await onSubmit(goalToEdit.id, Number(goalToEdit.current_pkr || 0) + Number(amount));
            setLoading(false);
            setAmount('');
          }}
          disabled={loading || !amount || Number(amount) <= 0}
          className="w-full mt-4 py-4 bg-lime-400 text-gray-900 rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-lime-500 transition-colors disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Deposit Funds'}
        </button>
      </motion.div>
    </div>
  );
};

const TimelineModal = ({ isOpen, onClose, goals }: any) => {
  if (!isOpen) return null;

  const iconMapping: Record<string, any> = { Target, Car, Building2, Plane, GraduationCap, HeartPulse };

  const timelineGoals = [...goals]
    .filter((g: any) => g.deadline)
    .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-white rounded-[40px] p-10 shadow-2xl flex flex-col gap-8 max-h-[85vh] overflow-y-auto scrollbar-hide"
      >
        <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">Timeline View</h3>
            <p className="text-gray-500 font-medium mt-1">Your financial milestones organized by target date</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {timelineGoals.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center">
            <Target className="w-16 h-16 text-gray-300 mb-4" />
            <h4 className="text-xl font-bold text-gray-900 mb-2">No Deadlines Set</h4>
            <p className="text-gray-500">Add target dates to your goals to see them plotted on your timeline.</p>
          </div>
        ) : (
          <div className="relative pl-8 space-y-12 py-4">
            <div className="absolute left-6 top-4 bottom-4 w-1 bg-gradient-to-b from-primary via-lime-400 to-gray-200 rounded-full opacity-60" />
            {timelineGoals.map((goal: any, i: number) => {
              const IconCmp = iconMapping[goal.icon] || Target;
              const prog = Math.min(100, Math.round((Number(goal.current_pkr) / Number(goal.target_pkr)) * 100)) || 0;
              const dateObj = new Date(goal.deadline);
              const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              const isPast = dateObj < new Date();

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative pl-6"
                >
                  <div className="absolute left-[-26px] top-4 w-6 h-6 rounded-full border-[4px] border-white bg-primary shadow-md flex items-center justify-center z-10">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                  <div className="bg-gray-50 p-6 rounded-[24px] border border-gray-100 hover:border-primary/30 transition-colors group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary shrink-0">
                          <IconCmp className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xl font-bold text-gray-900 leading-tight">{goal.name}</h4>
                            {prog >= 100 && (
                              <span className="px-2 py-0.5 bg-lime-100 text-lime-700 text-[10px] font-black uppercase rounded-md">Achieved</span>
                            )}
                          </div>
                          <p className={`text-sm font-black uppercase tracking-widest mt-1.5 ${isPast && prog < 100 ? 'text-rose-500' : 'text-primary'}`}>
                            {isPast && prog < 100 ? 'Overdue - ' + formattedDate : formattedDate}
                          </p>
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <div className="text-xl font-black text-gray-900">Rs {Number(goal.target_pkr).toLocaleString()}</div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Target Amount</div>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center gap-4">
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${prog}%` }} />
                      </div>
                      <span className="text-sm font-black text-gray-900 w-10 text-right">{prog}%</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ── GoalsTab ──────────────────────────────────────────────────────────────────

export const GoalsTab = () => {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);

  const iconMapping: Record<string, any> = { Target, Car, Building2, Plane, GraduationCap, HeartPulse };

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/goals', { headers: { Authorization: `Bearer ${token}` } });
      setGoals(res.data.goals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleCreateOrUpdateGoal = async (data: any) => {
    try {
      const token = localStorage.getItem('token');
      if (selectedGoal) {
        await axios.put(`/api/goals/${selectedGoal.id}`, data, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/api/goals', data, { headers: { Authorization: `Bearer ${token}` } });
      }
      await fetchGoals();
      setIsGoalModalOpen(false);
      setSelectedGoal(null);
    } catch (err) {
      alert('Failed to save goal.');
    }
  };

  const handleAdjustSavings = async (goalId: string, newCurrentPkr: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/goals/${goalId}`, { current_pkr: newCurrentPkr }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchGoals();
      setIsAdjustModalOpen(false);
      setSelectedGoal(null);
    } catch (err) {
      alert('Failed to adjust savings.');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/goals/${goalId}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchGoals();
    } catch (err) {
      alert('Failed to delete goal.');
    }
  };

  const getGoalColor = (index: number) => {
    const colors = ['#3B82F6', '#A3E635', '#10B981', '#F97316', '#F43F5E', '#8B5CF6'];
    return colors[index % colors.length];
  };

  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_pkr || 0), 0);
  const totalCurrent = goals.reduce((sum, g) => sum + Number(g.current_pkr || 0), 0);
  const avgProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  const formattedGoals = goals.map((g, i) => {
    const prog = Math.min(100, Math.round((Number(g.current_pkr) / Number(g.target_pkr)) * 100)) || 0;
    const IconCmp = iconMapping[g.icon] || Target;
    return { ...g, progress: prog, color: getGoalColor(i), iconCmp: <IconCmp className="w-5 h-5" /> };
  });

  const chartData = formattedGoals.length > 0
    ? formattedGoals
    : [{ name: 'Empty', progress: 100, color: '#f3f4f6', id: 'empty', label: 'Empty' }];

  return (
    <div className="flex-1 flex flex-col gap-10">
      <AnimatePresence>
        {isGoalModalOpen && (
          <GoalModal
            isOpen={isGoalModalOpen}
            onClose={() => { setIsGoalModalOpen(false); setSelectedGoal(null); }}
            onSubmit={handleCreateOrUpdateGoal}
            goalToEdit={selectedGoal}
          />
        )}
        {isAdjustModalOpen && (
          <AdjustSavingsModal
            isOpen={isAdjustModalOpen}
            onClose={() => { setIsAdjustModalOpen(false); setSelectedGoal(null); }}
            onSubmit={handleAdjustSavings}
            goalToEdit={selectedGoal}
          />
        )}
        {isTimelineModalOpen && (
          <TimelineModal
            isOpen={isTimelineModalOpen}
            onClose={() => setIsTimelineModalOpen(false)}
            goals={goals}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-2 font-display tracking-tight text-balance">Financial Goals</h1>
          <p className="text-gray-500 font-medium text-lg">Track and manage your long-term savings objectives</p>
        </div>
        <button
          onClick={() => { setSelectedGoal(null); setIsGoalModalOpen(true); }}
          className="flex items-center gap-3 bg-primary text-white px-8 py-4 rounded-[24px] font-bold shadow-xl shadow-primary/20 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 text-white" />
          Create New Goal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white/60 p-8 rounded-[40px] border border-white/40 shadow-sm">
          <p className="text-gray-500 text-sm font-black uppercase tracking-widest mb-2">Total Goal Volume</p>
          <h3 className="text-4xl font-black text-gray-900">Rs {totalTarget.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-2 text-lime-600 font-bold text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>Currently saved: Rs {totalCurrent.toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-white/60 p-8 rounded-[40px] border border-white/40 shadow-sm">
          <p className="text-gray-500 text-sm font-black uppercase tracking-widest mb-2">Active Goals</p>
          <h3 className="text-4xl font-black text-gray-900">{goals.length}</h3>
          <div className="mt-4 flex items-center gap-2 text-gray-500 font-bold text-sm">
            <span>{goals.filter(g => Number(g.current_pkr) >= Number(g.target_pkr)).length} goals completed</span>
          </div>
        </div>
        <div className="bg-white/60 p-8 rounded-[40px] border border-white/40 shadow-sm">
          <p className="text-gray-500 text-sm font-black uppercase tracking-widest mb-2">Average Progress</p>
          <h3 className="text-4xl font-black text-gray-900">{avgProgress.toFixed(1)}%</h3>
          <div className="mt-4 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${avgProgress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 px-2">Active Savings Goals</h2>
          {loading ? (
            <div className="flex justify-center p-10"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>
          ) : goals.length === 0 ? (
            <div className="bg-white/50 p-10 rounded-[32px] text-center border border-dashed border-gray-300">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No goals set yet</h3>
              <p className="text-gray-500 mb-6">Create your first financial goal to start tracking progress.</p>
              <button onClick={() => setIsGoalModalOpen(true)} className="px-6 py-3 bg-white text-primary font-bold rounded-xl shadow-sm border border-gray-100">Add Goal</button>
            </div>
          ) : (
            <div className="grid gap-6">
              {formattedGoals.map((goal) => (
                <motion.div
                  key={goal.id}
                  whileHover={{ scale: 1.01, x: 5 }}
                  className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 flex items-center gap-6 group cursor-pointer relative"
                >
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-primary shrink-0 text-2xl bg-primary/5">
                    {goal.iconCmp}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xl font-bold text-gray-900 truncate pr-4">{goal.name}</h4>
                      <span className="text-sm font-black text-gray-500 shrink-0">Rs {Number(goal.current_pkr).toLocaleString()} / {Number(goal.target_pkr).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${goal.progress}%` }}
                          className="h-full"
                          style={{ backgroundColor: goal.color }}
                        />
                      </div>
                      <span className="text-sm font-black text-gray-900 w-10 text-right">{goal.progress}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 bg-white/90 p-2 rounded-xl backdrop-blur-sm shadow-xl border border-gray-50">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedGoal(goal); setIsGoalModalOpen(true); }}
                      className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center hover:bg-blue-200"
                      title="Edit Goal"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }}
                      className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center hover:bg-rose-200"
                      title="Delete Goal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-8">
          <div className="bg-gray-900 rounded-[48px] p-10 text-white relative overflow-hidden h-fit">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-lime-400" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-white/60">Goal Forecast</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 leading-tight">
                {goals.length > 0
                  ? `You have ${goals.length} active goals tracked.`
                  : 'Set up goals to see AI forecasts.'}
              </h3>
              <p className="text-white/60 font-medium text-lg mb-8">
                {goals.length > 0
                  ? `Your top priority goal is currently at ${formattedGoals[0]?.progress || 0}% completion.`
                  : 'Add your first goal to get started with smart savings tracking.'}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsGoalModalOpen(true)}
                  className="bg-lime-400 text-gray-900 px-6 py-3 rounded-2xl font-bold transition-transform hover:scale-105"
                >
                  Create Goal
                </button>
                <button onClick={() => setIsTimelineModalOpen(true)} className="bg-white/10 text-white px-6 py-3 rounded-2xl font-bold transition-transform hover:scale-105">View Timeline</button>
              </div>
            </div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
          </div>

          <div className="bg-white/60 p-10 rounded-[48px] border border-white/40 shadow-sm flex-1 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Goal Contributions Overview</h3>
            <div className="flex-1 min-h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="progress"
                    stroke="none"
                  >
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    formatter={(value: any, name: any, props: any) => [`${value}%`, props.payload.name || props.payload.label]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              {formattedGoals.map(goal => (
                <div key={goal.id} className="flex items-center gap-2 truncate">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: goal.color }} />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-tight truncate">{goal.name}</span>
                </div>
              ))}
              {formattedGoals.length === 0 && (
                <span className="text-xs text-gray-400">No data available</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
