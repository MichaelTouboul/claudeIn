import { Router } from "express";
import * as projectService from "../services/project.service.js";
import * as linksService from "../services/links.service.js";

const router = Router();

router.get("/", async (req, res) => {
  const force = req.query.refresh === "true";
  const projects = await projectService.getProjects(force);
  res.json(projects);
});

router.get("/:id", async (req, res) => {
  const project = await projectService.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

router.get("/:id/agents", async (req, res) => {
  const agents = await projectService.getProjectAgents(req.params.id);
  res.json(agents);
});

router.get("/:id/skills", async (req, res) => {
  const skills = await projectService.getProjectSkills(req.params.id);
  res.json(skills);
});

router.get("/:id/hooks", async (req, res) => {
  const hooks = await projectService.getProjectHooks(req.params.id);
  res.json(hooks);
});

router.get("/:id/links", async (req, res) => {
  const links = await linksService.getLinksForProject(req.params.id);
  res.json(links);
});

router.post("/:id/links", async (req, res) => {
  const { agent_name } = req.body;
  if (!agent_name) return res.status(400).json({ error: "agent_name required" });

  const userAgents = await projectService.getProjectAgents("user");
  const agent = userAgents.find((a) => a.id === agent_name);

  await linksService.linkAgent(agent_name, req.params.id);

  if (agent && agent.subAgents.length > 0) {
    const existingAgentIds = new Set(userAgents.map((a) => a.id));
    for (const sub of agent.subAgents) {
      if (existingAgentIds.has(sub)) {
        await linksService.linkAgent(sub, req.params.id);
      }
    }
  }

  res.status(201).json({ ok: true });
});

router.delete("/:id/links/:agentName", async (req, res) => {
  const userAgents = await projectService.getProjectAgents("user");
  const agent = userAgents.find((a) => a.id === req.params.agentName);

  await linksService.unlinkAgent(req.params.agentName, req.params.id);

  if (agent && agent.subAgents.length > 0) {
    for (const sub of agent.subAgents) {
      await linksService.unlinkAgent(sub, req.params.id);
    }
  }

  res.status(204).end();
});

router.get("/:id/dashboard", async (req, res) => {
  const project = await projectService.getProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const [agents, skills, hooks] = await Promise.all([
    projectService.getProjectAgents(req.params.id),
    projectService.getProjectSkills(req.params.id),
    projectService.getProjectHooks(req.params.id),
  ]);

  let linkedAgentNames: string[] = [];
  let userAgents: typeof agents = [];
  let userSkills: typeof skills = [];

  if (req.params.id !== "user") {
    [linkedAgentNames, userAgents, userSkills] = await Promise.all([
      linksService.getLinksForProject(req.params.id),
      projectService.getProjectAgents("user"),
      projectService.getProjectSkills("user"),
    ]);
  }

  const linkedSet = new Set(linkedAgentNames);

  const taggedUserAgents = userAgents.map((a) => ({
    ...a,
    scope: "user" as const,
    linked: linkedSet.has(a.id),
  }));

  res.json({
    project,
    agents: [
      ...agents.map((a) => ({ ...a, scope: "project" as const, linked: true })),
      ...taggedUserAgents,
    ],
    skills: [
      ...skills,
      ...userSkills.map((s) => ({ ...s, scope: "user" as const })),
    ],
    hooks,
  });
});

export default router;
