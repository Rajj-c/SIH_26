"use client";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  PageHeading,
  DataState,
  Empty,
  Field,
  SaveButton,
  Tag,
  useAction,
} from "./primitives";
import { useLearningTracks, trackAction } from "@/lib/use-learning-tracks";
import { usePlatformData, type Role } from "@/lib/platform-store";
import { assessmentLevels } from "@/lib/assessment-catalog";

const newModule = () => ({
  id: crypto.randomUUID(),
  title: "",
  description: "",
  level: "beginner",
  topics: "",
});
const newResource = () => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  url: "",
});
export function LearningTrackPublisher({ role }: { role: Role }) {
  const state = useLearningTracks(),
    platform = usePlatformData(),
    action = useAction();
  const [modules, setModules] = useState<ReturnType<typeof newModule>[]>([]);
  const [resources, setResources] = useState<ReturnType<typeof newResource>[]>(
    [],
  );
  const owned =
    state.data?.filter((c) => c.owner_id === platform.data?.profile.id) ?? [];
  return (
    <DashboardShell role={role} title="Learning track studio">
      <div className="space-y-6">
        <PageHeading
          eyebrow="Publisher studio"
          title="Teach what your industry needs."
          description="Publish your own curriculum and real resource links. These practice tracks do not imply accreditation or provider certification. Published content is fixed so learner history stays meaningful."
        />
        <DataState {...state} retry={state.refresh} />
        <DataState {...platform} retry={platform.refresh} />
        {action.feedback}
        <details className="glass-panel rounded-3xl p-6">
          <summary className="cursor-pointer font-semibold">
            Create a learning track
          </summary>
          <form
            className="mt-5 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void action.run(async () => {
                if (!modules.length || !resources.length)
                  throw new Error("Add at least one module and one resource.");
                await trackAction("publish_learning_track", {
                  payload: {
                    title: f.get("title"),
                    category: f.get("category"),
                    description: f.get("description"),
                    modules: modules.map((m) => ({
                      id: m.id,
                      title: m.title,
                      description: m.description,
                      level: m.level,
                      subTopics: m.topics
                        .split("\n")
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((title, i) => ({
                          id: `topic-${i + 1}`,
                          title,
                          duration: "Publisher estimate not supplied",
                        })),
                    })),
                    resources: resources.map(({ id, ...r }) => r),
                  },
                });
              }, "Learning track published. Students can now discover it.");
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title">
                <input
                  name="title"
                  className="field"
                  required
                  minLength={5}
                  maxLength={160}
                />
              </Field>
              <Field label="Category">
                <input
                  name="category"
                  className="field"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                name="description"
                className="field"
                required
                minLength={20}
                maxLength={4000}
              />
            </Field>
            {modules.map((m, i) => (
              <fieldset
                key={m.id}
                className="glass-row rounded-2xl p-4 space-y-3"
              >
                <legend className="font-semibold">Module {i + 1}</legend>
                <Field label="Module title">
                  <input
                    className="field"
                    required
                    minLength={3}
                    maxLength={160}
                    value={m.title}
                    onChange={(e) =>
                      setModules(
                        modules.map((x) =>
                          x.id === m.id ? { ...x, title: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Module description">
                  <textarea
                    className="field"
                    required
                    minLength={10}
                    maxLength={2000}
                    value={m.description}
                    onChange={(e) =>
                      setModules(
                        modules.map((x) =>
                          x.id === m.id
                            ? { ...x, description: e.target.value }
                            : x,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Difficulty">
                  <select
                    className="field"
                    value={m.level}
                    onChange={(e) =>
                      setModules(
                        modules.map((x) =>
                          x.id === m.id ? { ...x, level: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    {Object.entries(assessmentLevels).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Practice topics — one per line (maximum 30)">
                  <textarea
                    className="field"
                    required
                    value={m.topics}
                    onChange={(e) =>
                      setModules(
                        modules.map((x) =>
                          x.id === m.id ? { ...x, topics: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setModules(modules.filter((x) => x.id !== m.id))
                  }
                >
                  Remove module
                </Button>
              </fieldset>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={modules.length >= 20}
              onClick={() => setModules([...modules, newModule()])}
            >
              Add module
            </Button>
            {resources.map((r, i) => (
              <fieldset
                key={r.id}
                className="glass-row rounded-2xl p-4 space-y-3"
              >
                <legend className="font-semibold">Resource {i + 1}</legend>
                <Field label="Resource name">
                  <input
                    className="field"
                    required
                    minLength={3}
                    maxLength={160}
                    value={r.name}
                    onChange={(e) =>
                      setResources(
                        resources.map((x) =>
                          x.id === r.id ? { ...x, name: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Why learners should use it">
                  <textarea
                    className="field"
                    required
                    minLength={10}
                    maxLength={1000}
                    value={r.description}
                    onChange={(e) =>
                      setResources(
                        resources.map((x) =>
                          x.id === r.id
                            ? { ...x, description: e.target.value }
                            : x,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="HTTPS resource URL">
                  <input
                    type="url"
                    pattern="https://.*"
                    className="field"
                    required
                    maxLength={2000}
                    value={r.url}
                    onChange={(e) =>
                      setResources(
                        resources.map((x) =>
                          x.id === r.id ? { ...x, url: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setResources(resources.filter((x) => x.id !== r.id))
                  }
                >
                  Remove resource
                </Button>
              </fieldset>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={resources.length >= 20}
              onClick={() => setResources([...resources, newResource()])}
            >
              Add learning resource
            </Button>
            <Field label="Publication confirmation">
              <span className="flex gap-2 items-start">
                <input type="checkbox" required />I have reviewed this
                curriculum and have permission to publish it. External links are
                not proof of a provider partnership.
              </span>
            </Field>
            <SaveButton busy={action.busy}>Publish learning track</SaveButton>
          </form>
        </details>
        {!state.loading && !state.error && !owned.length && (
          <Empty
            title="Your curriculum starts here"
            description="Publish actual learning resources; nothing is pre-filled or fabricated."
          />
        )}
        {owned.map((c) => (
          <article key={c.id} className="glass-panel rounded-3xl p-6 space-y-3">
            <Tag>{c.status}</Tag>
            <h2 className="text-xl font-semibold">{c.title}</h2>
            <p className="text-sm text-muted-foreground">
              {c.publisher_name} · {c.totalModules} modules ·{" "}
              {c.resources.length} resources
            </p>
            <p>{c.description}</p>
            {c.status === "Published" && (
              <Button
                variant="outline"
                disabled={action.busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Archive this track? New practice starts will stop; existing reports remain saved.",
                    )
                  )
                    void action.run(
                      () =>
                        trackAction("archive_learning_track", { track: c.id }),
                      "Learning track archived.",
                    );
                }}
              >
                Archive track
              </Button>
            )}
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}
