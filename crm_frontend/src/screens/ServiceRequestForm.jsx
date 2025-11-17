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
  const { getToken, dummyAuth } = useAuth();
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

      const endpointPath = "/service-requests";
      const base = api?.defaults?.baseURL || process.env.REACT_APP_API_BASE || "/api/v1";
      const finalUrl = `${base}${endpointPath}`;

      // Defensive log for diagnostics (no secrets)
      // eslint-disable-next-line no-console
      console.info("[SR] POST", finalUrl, { payloadSummary: { title: payload.title, customer_id: payload.customer_id, priority: payload.priority, due_date: !!payload.due_date } });

      // DEMO/DUMMY mode: short-circuit to avoid backend dependency or 404 due to proxy/base issues
      const apiFeatureEnabled = String(process.env.REACT_APP_FEATURE_ENABLE_API || "true") === "true";
      if (dummyAuth || !apiFeatureEnabled) {
        // eslint-disable-next-line no-console
        console.info("[SR] Demo mode or API disabled -> short-circuit success (no network)");
        toast.push("Service request created", "success");
        reset();
        return;
      }

      // Real API call (expects backend POST /api/v1/service-requests)
      const res = await api.post(endpointPath, payload);
      // eslint-disable-next-line no-console
      console.info("[SR] Response status:", res?.status);
      toast.push("Service request created", "success");
      reset();
    } catch (e) {
      const status = e?.response?.status;
      const base = api?.defaults?.baseURL || process.env.REACT_APP_API_BASE || "/api/v1";
      const path = "/service-requests";
      const full = `${base}${path}`;
      let msg;
      if (status === 404) {
        msg = `Endpoint not found (404) at ${full}. Check REACT_APP_API_BASE and backend route POST ${path}.`;
      } else if (status) {
        msg = `Server error (${status}) when calling ${full}.`;
      } else {
        msg = `Network error: could not reach ${full}.`;
      }
      // eslint-disable-next-line no-console
      console.error("[SR] Create failed", {
        status: e?.response?.status,
        statusText: e?.response?.statusText,
        baseURL: api?.defaults?.baseURL,
        path,
        message: e?.message,
        responseData: e?.response?.data,
      });
      toast.push(msg, "error");
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
