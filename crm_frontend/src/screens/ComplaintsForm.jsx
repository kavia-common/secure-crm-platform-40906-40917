import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Select, TextArea } from "../components/forms/Controls";
import { Button } from "../components/primitives/Button";
import { useToast } from "../components/feedback/Toast";
import { useNavigate } from "react-router-dom";
import { getApiClient } from "../services/apiClient";
import { eventBus } from "../services/ws";
import { shouldUseFallback, markResourceAvailable, markResourceUnavailable } from "../services/runtimeFlags";
import { addComplaint } from "../services/demoStore";

/**
 * PUBLIC_INTERFACE
 * ComplaintsForm: Create a new complaint with validation and graceful API/demo fallback.
 * Fields: title, description, customer, priority, category.
 * Default status is "Open" in demo mode; API maps priority -> severity.
 */
const schema = z.object({
  title: z.string().min(3, "Title is too short"),
  description: z.string().min(5, "Description is too short"),
  customerId: z.string().min(1, "Select a customer"),
  priority: z.enum(["Low", "Medium", "High"]),
  category: z.string().min(2, "Category is required"),
});

export default function ComplaintsForm() {
  const { push } = useToast();
  const navigate = useNavigate();
  const api = getApiClient(async () => null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      customerId: "",
      priority: "Medium",
      category: "Product",
    },
  });

  const createLocal = (values) => {
    const payload = {
      title: values.title,
      customer_id: values.customerId,
      priority: values.priority,
      category: values.category,
      status: "Open",
    };
    const created = addComplaint(payload);
    eventBus.emit("complaint:created", created);
    push("Complaint created", "success");
    reset();
    navigate("/complaints", { replace: true });
  };

  const onSubmit = async (values) => {
    try {
      const resourceKey = "complaints";
      if (shouldUseFallback(resourceKey)) {
        createLocal(values);
        return;
      }

      // API payload based on backend schema: ComplaintCreate { customer_id, category, severity, regulator_flag? }
      const body = {
        customer_id: values.customerId,
        category: values.category,
        severity: values.priority, // map UI priority -> API severity
        regulator_flag: false,
      };

      const res = await api.post("/complaints", body);
      try { markResourceAvailable(resourceKey); } catch {}

      const created = {
        id: res?.data?.id || "",
        title: values.title,
        customer_id: values.customerId,
        priority: values.priority,
        category: values.category,
        status: res?.data?.status || "Open",
        created_at: new Date().toISOString(),
      };
      eventBus.emit("complaint:created", created);
      push("Complaint created", "success");
      reset();
      navigate("/complaints", { replace: true });
    } catch (e) {
      // Mark resource unavailable and fallback to local creation
      try { markResourceUnavailable("complaints"); } catch {}
      createLocal(values);
    }
  };

  return (
    <section aria-labelledby="cmpf-title">
      <h1 id="cmpf-title">Create Complaint</h1>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="Title"
          name="title"
          register={register}
          required
          error={errors.title?.message}
          autoFocus
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
        <Input
          label="Category"
          name="category"
          register={register}
          required
          error={errors.category?.message}
          placeholder="e.g., Billing, Product, Service"
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
          <Button type="button" variant="secondary" onClick={() => navigate("/complaints")}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}
