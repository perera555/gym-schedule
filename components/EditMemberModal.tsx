"use client";

import { useState } from "react";
import type { Actions } from "@/lib/store";
import type { MemberRecord } from "@/lib/types";
import ProfileForm from "./ProfileForm";
import { PhotoPicker } from "./ProgressView";
import { Modal } from "./ui";

/** Edit any member: photo, personal details, body stats; optionally rebuild the current phase. */
export default function EditMemberModal({ rec, actions, onClose }: { rec: MemberRecord | null; actions: Actions; onClose: () => void }) {
  const [photo, setPhoto] = useState<string | undefined>(rec?.member.photo);
  const [rebuild, setRebuild] = useState(false);
  if (!rec) return null;
  return (
    <Modal open onClose={onClose}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-cyan-300">Edit member · {rec.member.membershipNo}</div>
          <h2 className="text-xl font-black text-white">{rec.member.profile.name}</h2>
        </div>
        <PhotoPicker photo={photo} onChange={setPhoto} size="h-20 w-20" />
      </div>
      <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3 text-sm">
        <input type="checkbox" checked={rebuild} onChange={(e) => setRebuild(e.target.checked)} className="mt-0.5 h-4 w-4 accent-cyan-400" />
        <span>
          <span className="block font-semibold text-white">Rebuild the current 3-month gym schedule with these details</span>
          <span className="block text-xs text-slate-400">Leave off to only update the details (completed days and history are kept either way).</span>
        </span>
      </label>
      <ProfileForm
        mode="edit"
        initial={rec.member.profile}
        submitLabel="💾 Save changes"
        onCancel={onClose}
        onSubmit={(p) => {
          actions.updateMember(rec.id, p, { photo: photo ?? null, rebuild });
          onClose();
        }}
      />
    </Modal>
  );
}
