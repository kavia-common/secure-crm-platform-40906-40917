import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Select, TextArea, DatePicker } from "../components/forms/Controls";
import { Button } from "../components/primitives/Button";
import { useToast } from "../components/feedback/Toast";
import { Modal } from "../components/overlays/Overlays";
import { getApiClient } from "../services/apiClient";
import { useAuth } from "../auth/AuthContext";

/**
 * PUBLIC_INTERFACE
 * Service Request Form with validation and submit to API placeholder.
 */
const schema = z.object({
  title: z.string().min(3, "Title is too short"),
  customerId: z.string().min(1, "Select a customer"),
  priority: z.enum(["Low", "Medium", "High"]),
  dueDate: z.string().optional(),
  description: z.string().min(5, "Description is too short"),
});

export default function ServiceRequestForm() {
  const { getToken } = useAuth();
  const api = getApiClient(getToken);
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      customerId: "",
      priority: "Medium",
      dueDate: "",
      description: "",
    },
  });

  const onSubmit = async (values) => {
    // Open confirm modal first
    setConfirmOpen(true);
  };

  const doCreate = async () => {
    setConfirmOpen(false);
    try {
      const payload = {
        title: watch("title"),
        customer_id: watch("customerId"),
        priority: watch("priority"),
        due_date: watch("dueDate") || null,
        description: watch("description"),
      };
      // Placeholder backend route (to be implemented in S3)
      await api.post("/service-requests", payload);
      toast.push("Service request created", "success");
      reset();
    } catch (e) {
      toast.push(`Failed to create: ${e?.message || "Unknown error"}`, "error");
    }
  };

  return (
    <section aria-labelledby="srf-title">
      <h1 id="srf-title">Create Service Request</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="Title"
          name="title"
          register={register}
          required
          error={errors.title?.message}
        />
        <Select
          label="Customer"
          name="customerId"
          register={register}
          required
          error={errors.customerId?.message}
          options={[
            { label: "Select…", value: "" },
            { label: "Acme Corp", value: "c1" },
            { label: "Globex", value: "c2" },
            { label: "Initech", value: "c3" },
          ]}
        />
        <Select
          label="Priority"
          name="priority"
          register={register}
          required
          error={errors.priority?.message}
          options={[
            { label: "Low", value: "Low" },
            { label: "Medium", value: "Medium" },
            { label: "High", value: "High" },
          ]}
        />
        <DatePicker
          label="Due Date"
          name="dueDate"
          control={control}
          rules={{}}
          hint="Optional"
          error={errors.dueDate?.message}
        />
        <TextArea
          label="Description"
          name="description"
          rows={6}
          register={register}
          required
          error={errors.description?.message}
        />
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <Button type="submit" disabled={isSubmitting}>Submit</Button>
          <Button type="button" variant="secondary" onClick={() => reset()}>
            Reset
          </Button>
        </div>
      </form>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Create Service Request?"
        footer={
          <>
            <button
              onClick={() => setConfirmOpen(false)}
              style={{ border: "1px solid rgba(17,24,39,.12)", padding: "6px 10px", borderRadius: 6, background: "var(--color-surface)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={doCreate}
              style={{ border: "none", padding: "8px 12px", borderRadius: 6, background: "var(--color-primary)", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              Confirm
            </button>
          </>
        }
      >
        <p>Are you sure you want to create this service request?</p>
      </Modal>
    </section>
  );
}
