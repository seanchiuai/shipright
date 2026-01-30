"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Plus, Trash2 } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { Requirements } from "@/lib/types";

export function RequirementsSummary({
  requirements,
  projectId,
  loading,
  onConfirm,
  onContinueConversation,
  onUpdateRequirements,
}: {
  requirements: Requirements;
  projectId: Id<"projects">;
  loading: boolean;
  onConfirm: () => void;
  onContinueConversation: () => void;
  onUpdateRequirements: (updated: Requirements) => Promise<void>;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = async (field: string) => {
    const updated = { ...requirements };
    if (field === "appName") updated.appName = editValue;
    await onUpdateRequirements(updated);
    setEditingField(null);
  };

  const saveUserEdit = async (index: number, type: string, coreNeed: string) => {
    const updated = { ...requirements, secondaryUsers: [...requirements.secondaryUsers] };
    updated.secondaryUsers[index] = { type, coreNeed };
    await onUpdateRequirements(updated);
    setEditingField(null);
  };

  const addSecondaryUser = async () => {
    const updated = {
      ...requirements,
      secondaryUsers: [...requirements.secondaryUsers, { type: "New User", coreNeed: "" }],
    };
    await onUpdateRequirements(updated);
  };

  const removeSecondaryUser = async (index: number) => {
    const updated = { ...requirements, secondaryUsers: requirements.secondaryUsers.filter((_, i) => i !== index) };
    await onUpdateRequirements(updated);
  };

  const saveFeatureEdit = async (index: number, value: string) => {
    const updated = { ...requirements, keyFeatures: [...requirements.keyFeatures] };
    updated.keyFeatures[index] = value;
    await onUpdateRequirements(updated);
    setEditingField(null);
  };

  const addFeature = async () => {
    const updated = {
      ...requirements,
      keyFeatures: [...requirements.keyFeatures, "New feature"],
    };
    await onUpdateRequirements(updated);
  };

  const removeFeature = async (index: number) => {
    const updated = { ...requirements, keyFeatures: requirements.keyFeatures.filter((_, i) => i !== index) };
    await onUpdateRequirements(updated);
  };

  return (
    <motion.div
      className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* App name + tagline */}
      <div className="pb-6 mb-6 border-b border-stone-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {editingField === "appName" ? (
              <div className="flex gap-2 items-center">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-9 text-lg font-medium"
                />
                <Button size="sm" variant="ghost" onClick={() => saveEdit("appName")}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <h3 className="font-serif text-2xl tracking-tight text-stone-900">
                {requirements.appName}
              </h3>
            )}
            <p className="text-[15px] text-stone-500 mt-1.5 leading-relaxed italic">
              {requirements.tagline}
            </p>
          </div>
          {editingField !== "appName" && (
            <button
              onClick={() => startEdit("appName", requirements.appName)}
              className="mt-1 p-1.5 rounded-lg text-stone-300 hover:text-stone-500 hover:bg-stone-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Platform + payments */}
        <div className="flex items-center gap-2 mt-4">
          <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-stone-100 text-stone-600 tracking-wide">
            {requirements.platform}
          </span>
          {requirements.hasPayments && (
            <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-stone-100 text-stone-600 tracking-wide">
              {requirements.paymentContext || "Payments"}
            </span>
          )}
        </div>
      </div>

      {/* Users */}
      <div className="pb-6 mb-6 border-b border-stone-100">
        <p className="text-[12px] font-medium text-stone-400 mb-3">Built for</p>
        <p className="text-[15px] text-stone-800 leading-relaxed">
          <span className="font-medium">{requirements.primaryUser.type}</span>
          {requirements.primaryUser.coreNeed && (
            <span className="text-stone-500"> — {requirements.primaryUser.coreNeed}</span>
          )}
        </p>

        {/* Additional users */}
        {requirements.secondaryUsers.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {requirements.secondaryUsers.map((u, i) => (
              <div key={i} className="flex items-start gap-2 group">
                {editingField === `user-${i}` ? (
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="User type"
                      className="h-7 text-sm"
                    />
                    <Input
                      value={editValue.includes("||") ? editValue.split("||")[1] : u.coreNeed}
                      onChange={(e) => {
                        const name = editValue.includes("||") ? editValue.split("||")[0] : editValue;
                        setEditValue(`${name}||${e.target.value}`);
                      }}
                      placeholder="Their core need"
                      className="h-7 text-sm"
                    />
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => {
                        const parts = editValue.split("||");
                        saveUserEdit(i, parts[0], parts[1] || u.coreNeed);
                      }}>
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="flex-1 text-[14px] text-stone-600">
                      <span className="font-medium text-stone-700">{u.type}</span>
                      {u.coreNeed && (
                        <span className="text-stone-400"> — {u.coreNeed}</span>
                      )}
                    </p>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingField(`user-${i}`); setEditValue(u.type); }}
                        className="p-1 rounded text-stone-300 hover:text-stone-500"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeSecondaryUser(i)}
                        className="p-1 rounded text-stone-300 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={addSecondaryUser}
          className="mt-3 inline-flex items-center gap-1 text-[12px] text-stone-400 hover:text-stone-600 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add user role
        </button>
      </div>

      {/* Features */}
      <div className="pb-6 mb-6 border-b border-stone-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-medium text-stone-400">Features</p>
          <button
            onClick={addFeature}
            className="inline-flex items-center gap-1 text-[12px] text-stone-400 hover:text-stone-600 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {requirements.keyFeatures.map((f, i) => (
            <div key={i} className="flex items-center gap-2 group">
              {editingField === `feature-${i}` ? (
                <div className="flex-1 flex gap-1.5">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Feature"
                    className="h-8 text-sm flex-1"
                  />
                  <Button size="sm" variant="ghost" onClick={() => saveFeatureEdit(i, editValue)}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="flex-1 px-3 py-1.5 text-[13px] rounded-xl bg-stone-50 text-stone-700 font-medium border border-stone-100">
                    {f}
                  </span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingField(`feature-${i}`); setEditValue(f); }}
                      className="p-1 rounded text-stone-300 hover:text-stone-500"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFeature(i)}
                      className="p-1 rounded text-stone-300 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Constraints */}
      {(requirements.constraints.mustHave.length > 0 || requirements.constraints.mustNotHave.length > 0) && (
        <div className="pb-6 mb-6 border-b border-stone-100">
          {requirements.constraints.mustHave.length > 0 && (
            <div className="mb-3">
              <p className="text-[12px] font-medium text-stone-400 mb-2">Must include</p>
              <div className="flex flex-wrap gap-1.5">
                {requirements.constraints.mustHave.map((c, i) => (
                  <span key={i} className="px-2.5 py-1 text-[12px] rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {requirements.constraints.mustNotHave.length > 0 && (
            <div>
              <p className="text-[12px] font-medium text-stone-400 mb-2">Must avoid</p>
              <div className="flex flex-wrap gap-1.5">
                {requirements.constraints.mustNotHave.map((c, i) => (
                  <span key={i} className="px-2.5 py-1 text-[12px] rounded-lg bg-red-50 text-red-600 border border-red-100 font-medium">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="pt-2 space-y-3">
        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 h-11 bg-stone-900 text-white text-[14px] font-medium rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 shadow-sm"
        >
          {loading ? "Processing..." : "Build My App"}
          {!loading && <span>&rarr;</span>}
        </button>
        <div className="text-center">
          <button
            onClick={onContinueConversation}
            disabled={loading}
            className="text-[12px] text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
          >
            Continue Conversation
          </button>
        </div>
      </div>
    </motion.div>
  );
}
