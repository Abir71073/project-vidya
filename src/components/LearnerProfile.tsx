import { useState, useEffect } from 'react';
import { UserCircle2, Plus, Loader2, Briefcase, GraduationCap, Building2, CheckCircle2 } from 'lucide-react';
import { useLearner } from '../context/LearnerContext';

const LANGUAGES = ['English', 'Hindi', 'Bengali'];

export default function LearnerProfilePage() {
  const { learners, activeLearner, switchLearner, createLearner, loading } = useLearner();
  const [showForm, setShowForm] = useState(false);
  const [jobRoles, setJobRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [currentAssignment, setCurrentAssignment] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [workExperienceYears, setWorkExperienceYears] = useState('');
  const [priorTrainings, setPriorTrainings] = useState('');
  const [role, setRole] = useState<'employee' | 'administrator'>('employee');
  const [language, setLanguage] = useState('English');

  useEffect(() => {
    fetch('/api/competency/job-roles')
      .then((res) => res.json())
      .then((data) => setJobRoles(data.jobRoles || []))
      .catch(() => setJobRoles([]));
  }, []);

  useEffect(() => {
    if (learners.length === 0 && !loading) setShowForm(true);
  }, [learners.length, loading]);

  const resetForm = () => {
    setName(''); setDesignation(''); setDepartment(''); setJobRole(''); setTargetRole('');
    setCurrentAssignment(''); setQualifications(''); setWorkExperienceYears('');
    setPriorTrainings(''); setRole('employee'); setLanguage('English');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createLearner({
        name: name.trim(),
        designation: designation.trim(),
        department: department.trim(),
        jobRole,
        // Empty select = "no career goal stated" -> omit the field entirely
        // rather than storing an empty string, so the recommendation engine's
        // `learner.targetRole && ...` check treats it as genuinely absent.
        ...(targetRole ? { targetRole } : {}),
        currentAssignment: currentAssignment.trim(),
        qualifications: qualifications.trim(),
        workExperienceYears: Number(workExperienceYears) || 0,
        priorTrainings: priorTrainings.split(',').map((t) => t.trim()).filter(Boolean),
        role,
        language,
      });
      resetForm();
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="mb-8">
        <h2 className="text-4xl font-['Bebas_Neue'] tracking-widest text-zinc-100 uppercase drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">Learner Profile</h2>
        <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest mt-2">
          No government SSO here yet — a lightweight local profile stands in for a real official identity (see SECURITY.md).
        </p>
      </div>

      {activeLearner && !showForm && (
        <div className="relative bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 p-6 mb-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_25px_50px_-20px_rgba(0,0,0,0.9)]">
          <div className="absolute top-0 left-0 right-0 h-px panel-accent-pink" />
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 shrink-0 bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-lg font-bold text-white uppercase">
                {activeLearner.name.slice(0, 1)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-100">{activeLearner.name}</h3>
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{activeLearner.designation || 'No designation set'}</p>
              </div>
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 border ${activeLearner.role === 'administrator' ? 'text-pink-400 border-pink-500/40 bg-pink-500/10' : 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10'}`}>
              {activeLearner.role}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <ProfileField icon={<Building2 className="w-3.5 h-3.5" />} label="Department" value={activeLearner.department} />
            <ProfileField icon={<Briefcase className="w-3.5 h-3.5" />} label="Job Role" value={activeLearner.jobRole} />
            <ProfileField icon={<Briefcase className="w-3.5 h-3.5" />} label="Target Role" value={activeLearner.targetRole || 'None set'} />
            <ProfileField icon={<Briefcase className="w-3.5 h-3.5" />} label="Current Assignment" value={activeLearner.currentAssignment} />
            <ProfileField icon={<GraduationCap className="w-3.5 h-3.5" />} label="Qualifications" value={activeLearner.qualifications} />
            <ProfileField icon={<Briefcase className="w-3.5 h-3.5" />} label="Work Experience" value={`${activeLearner.workExperienceYears} years`} />
            <ProfileField icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Prior Trainings" value={activeLearner.priorTrainings.join(', ') || 'None recorded'} />
          </div>
        </div>
      )}

      {learners.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Switch Profile (simulated login)</span>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-orange-500 uppercase tracking-widest hover:text-orange-400"
            >
              <Plus className="w-3.5 h-3.5" /> {showForm ? 'Cancel' : 'New Profile'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {learners.map((l) => (
              <button
                key={l.id}
                onClick={() => switchLearner(l.id)}
                className={`text-left p-3 border transition-all flex items-center gap-3 ${activeLearner?.id === l.id ? 'border-pink-500 bg-pink-500/10' : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'}`}
              >
                <UserCircle2 className={`w-6 h-6 shrink-0 ${activeLearner?.id === l.id ? 'text-pink-400' : 'text-zinc-600'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-200 truncate">{l.name}</p>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest truncate">{l.jobRole || 'Unassigned role'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="relative bg-zinc-950/90 backdrop-blur-md border border-zinc-800/80 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_30px_60px_-25px_rgba(0,0,0,0.9)]">
          <div className="absolute top-0 left-0 right-0 h-px panel-accent-orange" />
          <h3 className="text-xl font-['Bebas_Neue'] tracking-widest text-zinc-100 uppercase mb-6">Create Profile</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name (required)">
              <input value={name} onChange={(e) => setName(e.target.value)} className="ipt" placeholder="e.g. Priya Nair" required />
            </Field>
            <Field label="Designation">
              <input value={designation} onChange={(e) => setDesignation(e.target.value)} className="ipt" placeholder="e.g. Deputy Director" />
            </Field>
            <Field label="Department">
              <input value={department} onChange={(e) => setDepartment(e.target.value)} className="ipt" placeholder="e.g. Price Statistics Division" />
            </Field>
            <Field label="Job Role (for expected-competency comparison)">
              <select value={jobRole} onChange={(e) => setJobRole(e.target.value)} className="ipt">
                <option value="">Select a role...</option>
                {jobRoles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Target Role (optional — for career-path recommendations)">
              <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="ipt">
                <option value="">No target role set</option>
                {jobRoles.filter((r) => r !== jobRole).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Current Assignment">
              <input value={currentAssignment} onChange={(e) => setCurrentAssignment(e.target.value)} className="ipt" placeholder="e.g. CPI Compilation" />
            </Field>
            <Field label="Educational Qualifications">
              <input value={qualifications} onChange={(e) => setQualifications(e.target.value)} className="ipt" placeholder="e.g. M.Sc. Statistics" />
            </Field>
            <Field label="Work Experience (years)">
              <input type="number" min="0" value={workExperienceYears} onChange={(e) => setWorkExperienceYears(e.target.value)} className="ipt" placeholder="0" />
            </Field>
            <Field label="Preferred Language">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="ipt">
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Previous Trainings Completed (comma-separated)">
                <input value={priorTrainings} onChange={(e) => setPriorTrainings(e.target.value)} className="ipt" placeholder="e.g. Foundation Course LBSNAA, Advanced Sampling Techniques" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <span className="block text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-2">Role (prototype access control — see SECURITY.md)</span>
              <div className="flex bg-black border border-zinc-900 p-1">
                {(['employee', 'administrator'] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)} className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${role === r ? 'bg-zinc-900 text-pink-400 border border-zinc-800' : 'text-zinc-600 hover:text-zinc-400'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="mt-6 w-full bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-bold tracking-widest uppercase py-3 rounded-none text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Profile
          </button>
        </form>
      )}

      <style>{`.ipt { width: 100%; background: black; border: 1px solid #27272a; padding: 0.6rem 0.75rem; font-size: 0.8rem; color: #e4e4e7; outline: none; } .ipt:focus { border-color: #ec4899; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-2">{label}</label>
      {children}
    </div>
  );
}

function ProfileField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-zinc-600 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] text-zinc-600 uppercase tracking-widest">{label}</p>
        <p className="text-zinc-300 truncate">{value || '—'}</p>
      </div>
    </div>
  );
}
