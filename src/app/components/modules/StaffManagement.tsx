import { useState, useEffect } from "react";
import { Users, MapPin, Star, Clock, Shield, Search, Filter, Loader2, AlertCircle, X, UserPlus, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

import { StaffManageModal } from "./StaffManageModal";

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  assigned_zone: string;
  status: 'available' | 'busy' | 'off_duty';
  contact_number: string;
  performance_rating: number;
  complaints_handled: number;
  current_assignment_id?: string;
  auth_user_id?: string;
}

export function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         member.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || member.role === filterRole;
    const matchesStatus = filterStatus === "all" || member.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider">Available</span>;
      case 'busy':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wider">On Task</span>;
      case 'off_duty':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full uppercase tracking-wider">Off Duty</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full uppercase tracking-wider">{status}</span>;
    }
  };

  const roles = Array.from(new Set(staff.map(s => s.role)));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-blue-600" />
            Staff Management
          </h1>
          <p className="text-gray-500 text-sm">Monitor and manage your field workforce</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            <UserPlus size={16} />
            Generate Invite Code
          </button>
          <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 hidden md:block">
            <p className="text-xs text-blue-600 font-semibold uppercase">Total Active</p>
            <p className="text-xl font-bold text-blue-800">{staff.length}</p>
          </div>
          <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100 hidden md:block">
            <p className="text-xs text-green-600 font-semibold uppercase">Available</p>
            <p className="text-xl font-bold text-green-800">{staff.filter(s => s.status === 'available').length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input 
            type="text" 
            placeholder="Search by name or role..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select 
          className="border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="all">All Roles</option>
          {roles.map(role => <option key={role} value={role}>{role}</option>)}
        </select>

        <select 
          className="border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="busy">On Task</option>
          <option value="off_duty">Off Duty</option>
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500">Loading workforce data...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No staff members found</h3>
          <p className="text-gray-500">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((member) => (
            <div key={member.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                      {member.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{member.full_name}</h3>
                      <p className="text-xs text-blue-600 font-medium">{member.role}</p>
                    </div>
                  </div>
                  {getStatusBadge(member.status)}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={14} className="text-gray-400" />
                    <span>{member.assigned_zone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Shield size={14} className="text-gray-400" />
                    <span>{member.auth_user_id ? 'Authenticated Account' : 'Invite Pending'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-end items-center text-xs">
                <button 
                  onClick={() => { setSelectedStaff(member); setShowManageModal(true); }}
                  className="bg-white border border-gray-200 text-gray-700 px-4 py-1.5 rounded-lg font-bold hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Manage Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Generate Invite Code Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <UserPlus size={18} className="text-blue-600" />
                Generate Invite Code
              </h2>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {generatedCode ? (
                <div className="text-center space-y-4 py-4">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 size={24} className="text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Code Generated!</h3>
                  <p className="text-sm text-gray-500">Give this exact code to the worker. They will use it to link their account during sign up.</p>
                  <div className="bg-gray-100 p-4 rounded-xl border-2 border-dashed border-gray-300 font-mono text-2xl font-bold tracking-widest text-gray-800">
                    {generatedCode}
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode);
                      setGeneratedCode(null);
                      setShowInviteModal(false);
                    }}
                    className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-100 mt-2"
                  >
                    Copy & Close
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Select an existing staff member who hasn't registered yet to generate an invite code for them.
                  </p>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Worker</label>
                    <select id="inv_staff_id" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                      <option value="">-- Select Worker --</option>
                      {staff.filter(s => !s.auth_user_id).map(s => (
                        <option key={s.id} value={s.id}>{s.full_name} ({s.role} - {s.assigned_zone})</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={async () => {
                        const staffId = (document.getElementById('inv_staff_id') as HTMLSelectElement).value;
                        
                        if(!staffId) return alert("Please select a worker");
                        
                        const code = Math.random().toString(36).substring(2, 8).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
                        
                        try {
                          const { error } = await supabase.from('staff').update({
                            invite_code: code
                          }).eq("id", staffId);
                          if(error) throw error;
                          
                          // Show code in modal instead of alert
                          setGeneratedCode(code);
                          fetchStaff();
                        } catch(err: any) {
                          alert("Error generating code: " + err.message);
                        }
                      }}
                      className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                    >
                      Generate & Save
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showManageModal && selectedStaff && (
        <StaffManageModal 
          staff={selectedStaff} 
          onClose={(refresh) => {
            setShowManageModal(false);
            if (refresh) fetchStaff();
          }} 
        />
      )}
    </div>
  );
}
