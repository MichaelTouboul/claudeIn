//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let electron = require("electron");
let path = require("path");
path = __toESM(path);
let sql_js = require("sql.js");
sql_js = __toESM(sql_js);
let fs = require("fs");
fs = __toESM(fs);
let fs_promises = require("fs/promises");
fs_promises = __toESM(fs_promises);
let gray_matter = require("gray-matter");
gray_matter = __toESM(gray_matter);
let child_process = require("child_process");
let crypto = require("crypto");
let readline = require("readline");
readline = __toESM(readline);
//#region electron/services/db.ts
var HOME$3 = process.env.HOME || require("os").homedir();
var DB_DIR = path.default.join(HOME$3, ".claude-agent-manager");
var DB_PATH = path.default.join(DB_DIR, "data.db");
var db;
function rowsToObjects(stmt) {
	const cols = stmt.getColumnNames();
	const results = [];
	while (stmt.step()) {
		const row = stmt.get();
		const obj = {};
		for (let i = 0; i < cols.length; i++) obj[cols[i]] = row[i];
		results.push(obj);
	}
	stmt.free();
	return results;
}
function createWrapper(sqldb) {
	return {
		prepare(sql) {
			return {
				all(...params) {
					const stmt = sqldb.prepare(sql);
					if (params.length > 0) stmt.bind(params);
					const results = rowsToObjects(stmt);
					save();
					return results;
				},
				get(...params) {
					const stmt = sqldb.prepare(sql);
					if (params.length > 0) stmt.bind(params);
					const results = rowsToObjects(stmt);
					save();
					return results[0];
				},
				run(...params) {
					sqldb.run(sql, params);
					save();
				}
			};
		},
		exec(sql) {
			sqldb.exec(sql);
			save();
		}
	};
}
var wrapper;
function save() {
	const data = db.export();
	fs.default.writeFileSync(DB_PATH, Buffer.from(data));
}
function getDb() {
	if (!wrapper) throw new Error("Database not initialized. Call initDb() first.");
	return wrapper;
}
async function initDb() {
	fs.default.mkdirSync(DB_DIR, { recursive: true });
	const SQL = await (0, sql_js.default)();
	if (fs.default.existsSync(DB_PATH)) {
		const fileBuffer = fs.default.readFileSync(DB_PATH);
		db = new SQL.Database(fileBuffer);
	} else db = new SQL.Database();
	wrapper = createWrapper(db);
	wrapper.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL,
      session_id TEXT,
      event_type TEXT NOT NULL,
      tool_name TEXT,
      payload TEXT DEFAULT '{}',
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL,
      title TEXT,
      status TEXT DEFAULT 'running' CHECK (status IN ('running', 'done', 'failed')),
      session_id TEXT,
      tokens_in_total INTEGER DEFAULT 0,
      tokens_out_total INTEGER DEFAULT 0,
      cost_usd_total REAL DEFAULT 0,
      events_count INTEGER DEFAULT 0,
      started_at TEXT DEFAULT (datetime('now')),
      finished_at TEXT
    );
    CREATE TABLE IF NOT EXISTS agent_project_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL,
      project_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(agent_name, project_id)
    );
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type TEXT NOT NULL CHECK (item_type IN ('agent', 'skill', 'hook')),
      item_name TEXT NOT NULL,
      project_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(item_type, item_name, project_id)
    );
    CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_name);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_missions_agent ON missions(agent_name);
    CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
    CREATE INDEX IF NOT EXISTS idx_links_project ON agent_project_links(project_id);
    CREATE INDEX IF NOT EXISTS idx_links_agent ON agent_project_links(agent_name);
    CREATE INDEX IF NOT EXISTS idx_favorites_project ON favorites(project_id);
  `);
}
//#endregion
//#region electron/services/agent.service.ts
var AGENTS_DIR = path.default.join(process.env.HOME, ".claude", "agents");
async function exists$2(p) {
	try {
		await fs_promises.default.access(p);
		return true;
	} catch {
		return false;
	}
}
async function findMdFiles(dir) {
	const results = [];
	async function walk(current) {
		const entries = await fs_promises.default.readdir(current, { withFileTypes: true });
		for (const entry of entries) {
			const full = path.default.join(current, entry.name);
			if (entry.isDirectory()) await walk(full);
			else if (entry.name.endsWith(".md")) results.push(full);
		}
	}
	if (await exists$2(dir)) await walk(dir);
	return results;
}
async function findAnnexFiles(agentDir, agentFileName) {
	const annexFiles = [];
	if (!await exists$2(agentDir)) return annexFiles;
	const entries = await fs_promises.default.readdir(agentDir, { withFileTypes: true });
	for (const entry of entries) if (entry.isFile()) {
		const full = path.default.join(agentDir, entry.name);
		const content = await fs_promises.default.readFile(full, "utf-8");
		annexFiles.push({
			name: entry.name,
			path: full,
			content,
			isEnv: entry.name === ".env"
		});
	}
	return annexFiles;
}
function extractSubAgents$1(body) {
	const agents = [];
	const backtickPattern = /`(tw-[\w-]+)`/g;
	let match;
	while ((match = backtickPattern.exec(body)) !== null) if (!agents.includes(match[1])) agents.push(match[1]);
	return agents;
}
async function getMemoryFiles(agentDir) {
	const memDir = path.default.join(agentDir, "memory");
	if (!await exists$2(memDir)) return [];
	const entries = await fs_promises.default.readdir(memDir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) if (entry.isFile()) {
		const full = path.default.join(memDir, entry.name);
		const content = await fs_promises.default.readFile(full, "utf-8");
		const stat = await fs_promises.default.stat(full);
		files.push({
			name: entry.name,
			path: full,
			content,
			lastModified: stat.mtime.toISOString()
		});
	}
	return files;
}
function parseAgent(filePath, raw) {
	try {
		const { data, content } = (0, gray_matter.default)(raw);
		if (!data.name) return null;
		const frontmatter = data;
		const relativePath = path.default.relative(AGENTS_DIR, filePath);
		const folder = path.default.dirname(relativePath);
		return {
			id: frontmatter.name,
			filePath,
			relativePath,
			folder: folder === "." ? "" : folder,
			frontmatter,
			body: content.trim(),
			status: "created",
			subAgents: Array.isArray(frontmatter.subAgents) && frontmatter.subAgents.length > 0 ? frontmatter.subAgents : extractSubAgents$1(content),
			memoryFiles: [],
			annexFiles: []
		};
	} catch {
		return null;
	}
}
async function getAllAgents() {
	const mdFiles = await findMdFiles(AGENTS_DIR);
	const agents = [];
	for (const filePath of mdFiles) {
		const agent = parseAgent(filePath, await fs_promises.default.readFile(filePath, "utf-8"));
		if (agent) {
			agent.memoryFiles = await getMemoryFiles(path.default.dirname(filePath));
			agent.annexFiles = await findAnnexFiles(path.default.dirname(filePath), path.default.basename(filePath));
			const parentDir = path.default.dirname(path.default.dirname(filePath));
			const parentRelative = path.default.relative(AGENTS_DIR, parentDir);
			if (parentRelative && parentRelative !== ".") {
				const parentEnvPath = path.default.join(parentDir, ".env");
				if (await exists$2(parentEnvPath)) {
					if (!agent.annexFiles.some((f) => f.path === parentEnvPath)) {
						const content = await fs_promises.default.readFile(parentEnvPath, "utf-8");
						agent.annexFiles.push({
							name: ".env (shared)",
							path: parentEnvPath,
							content,
							isEnv: true
						});
					}
				}
			}
			agents.push(agent);
		}
	}
	return agents;
}
async function getAgent(name) {
	return (await getAllAgents()).find((a) => a.id === name) ?? null;
}
async function createAgent(payload) {
	const dir = path.default.join(AGENTS_DIR, payload.folder, payload.fileName);
	await fs_promises.default.mkdir(dir, { recursive: true });
	const filePath = path.default.join(dir, `${payload.fileName}.md`);
	const content = gray_matter.default.stringify(payload.body, payload.frontmatter);
	await fs_promises.default.writeFile(filePath, content, "utf-8");
	const agent = parseAgent(filePath, content);
	if (!agent) throw new Error("Failed to parse created agent");
	agent.memoryFiles = await getMemoryFiles(dir);
	agent.annexFiles = await findAnnexFiles(dir, `${payload.fileName}.md`);
	return agent;
}
async function updateAgent(name, payload) {
	const agent = await getAgent(name);
	if (!agent) throw new Error(`Agent ${name} not found`);
	const { data, content } = (0, gray_matter.default)(await fs_promises.default.readFile(agent.filePath, "utf-8"));
	const newFrontmatter = payload.frontmatter ? {
		...data,
		...payload.frontmatter
	} : data;
	const newBody = payload.body ?? content;
	const newContent = gray_matter.default.stringify(newBody, newFrontmatter);
	await fs_promises.default.writeFile(agent.filePath, newContent, "utf-8");
	const updated = parseAgent(agent.filePath, newContent);
	if (!updated) throw new Error("Failed to parse updated agent");
	updated.memoryFiles = await getMemoryFiles(path.default.dirname(agent.filePath));
	updated.annexFiles = agent.annexFiles;
	return updated;
}
async function deleteAgent(name) {
	const agent = await getAgent(name);
	if (!agent) throw new Error(`Agent ${name} not found`);
	const dir = path.default.dirname(agent.filePath);
	const entries = await fs_promises.default.readdir(dir);
	if (entries.filter((e) => e.endsWith(".md")).length === 1 && entries.length <= 2) await fs_promises.default.rm(dir, { recursive: true });
	else await fs_promises.default.unlink(agent.filePath);
}
async function resolveAgentMemoryDir(agentName) {
	const agent = await getAgent(agentName);
	if (!agent) return null;
	return path.default.join(path.default.dirname(agent.filePath), "memory");
}
async function updateMemoryFile(agentName, fileName, content) {
	const memDir = await resolveAgentMemoryDir(agentName);
	if (!memDir) throw new Error(`Agent ${agentName} not found`);
	await fs_promises.default.mkdir(memDir, { recursive: true });
	const memPath = path.default.join(memDir, fileName);
	await fs_promises.default.writeFile(memPath, content, "utf-8");
	return {
		name: fileName,
		path: memPath,
		content,
		lastModified: (await fs_promises.default.stat(memPath)).mtime.toISOString()
	};
}
async function deleteMemoryFile(agentName, fileName) {
	const memDir = await resolveAgentMemoryDir(agentName);
	if (!memDir) return;
	const memPath = path.default.join(memDir, fileName);
	if (await exists$2(memPath)) await fs_promises.default.unlink(memPath);
}
async function getFolders() {
	const folders = [""];
	if (!await exists$2(AGENTS_DIR)) return folders;
	async function walk(dir) {
		const entries = await fs_promises.default.readdir(dir, { withFileTypes: true });
		for (const entry of entries) if (entry.isDirectory()) {
			const full = path.default.join(dir, entry.name);
			folders.push(path.default.relative(AGENTS_DIR, full));
			await walk(full);
		}
	}
	await walk(AGENTS_DIR);
	return folders;
}
//#endregion
//#region electron/ipc/agents.ipc.ts
function registerAgentHandlers() {
	electron.ipcMain.handle("agents:list", () => getAllAgents());
	electron.ipcMain.handle("agents:get", (_e, name) => getAgent(name));
	electron.ipcMain.handle("agents:folders", () => getFolders());
	electron.ipcMain.handle("agents:create", (_e, payload) => createAgent(payload));
	electron.ipcMain.handle("agents:update", (_e, name, payload) => updateAgent(name, payload));
	electron.ipcMain.handle("agents:delete", (_e, name) => deleteAgent(name));
	electron.ipcMain.handle("agents:memory:update", (_e, agentName, fileName, content) => updateMemoryFile(agentName, fileName, content));
	electron.ipcMain.handle("agents:memory:delete", (_e, agentName, fileName) => deleteMemoryFile(agentName, fileName));
}
//#endregion
//#region electron/services/project.service.ts
var HOME$2 = process.env.HOME;
var USER_CLAUDE_DIR = path.default.join(HOME$2, ".claude");
var SCAN_DEPTH = 3;
var SKIP_DIRS = new Set([
	"node_modules",
	".git",
	".next",
	"dist",
	"build",
	".cache",
	".npm",
	".nvm",
	".cargo",
	".rustup",
	"Library",
	".Trash",
	"Applications",
	".docker",
	".vscode",
	".idea"
]);
async function exists$1(p) {
	try {
		await fs_promises.default.access(p);
		return true;
	} catch {
		return false;
	}
}
async function scanForProjects() {
	const projects = [];
	const seen = /* @__PURE__ */ new Set();
	async function walk(dir, depth) {
		if (depth > SCAN_DEPTH) return;
		try {
			const entries = await fs_promises.default.readdir(dir, { withFileTypes: true });
			for (const entry of entries) {
				if (!entry.isDirectory()) continue;
				if (entry.name.startsWith(".") && entry.name !== ".claude") continue;
				if (SKIP_DIRS.has(entry.name)) continue;
				const full = path.default.join(dir, entry.name);
				if (entry.name === ".claude") {
					const projectPath = dir;
					if (seen.has(projectPath) || projectPath === HOME$2) continue;
					seen.add(projectPath);
					const claudeDir = full;
					const agentsDir = path.default.join(claudeDir, "agents");
					const skillsDir = path.default.join(claudeDir, "skills");
					const settingsFile = path.default.join(claudeDir, "settings.json");
					const agentCount = await countMdFiles(agentsDir);
					const skillCount = await countSkills(skillsDir);
					projects.push({
						id: Buffer.from(projectPath).toString("base64url"),
						name: path.default.basename(projectPath),
						path: projectPath,
						claudeDir,
						hasAgents: agentCount > 0,
						hasSkills: skillCount > 0,
						hasSettings: await exists$1(settingsFile),
						agentCount,
						skillCount
					});
				} else await walk(full, depth + 1);
			}
		} catch {}
	}
	await walk(HOME$2, 0);
	const userProject = {
		id: "user",
		name: "User Scope",
		path: HOME$2,
		claudeDir: USER_CLAUDE_DIR,
		hasAgents: await exists$1(path.default.join(USER_CLAUDE_DIR, "agents")),
		hasSkills: await exists$1(path.default.join(USER_CLAUDE_DIR, "skills")),
		hasSettings: await exists$1(path.default.join(USER_CLAUDE_DIR, "settings.json")),
		agentCount: await countMdFiles(path.default.join(USER_CLAUDE_DIR, "agents")),
		skillCount: await countSkills(path.default.join(USER_CLAUDE_DIR, "skills"))
	};
	projects.unshift(userProject);
	return projects;
}
async function countMdFiles(dir) {
	if (!await exists$1(dir)) return 0;
	let count = 0;
	async function walk(d) {
		const entries = await fs_promises.default.readdir(d, { withFileTypes: true });
		for (const e of entries) {
			const full = path.default.join(d, e.name);
			if (e.isDirectory() && e.name !== "memory") await walk(full);
			else if (e.name.endsWith(".md")) try {
				const { data } = (0, gray_matter.default)(await fs_promises.default.readFile(full, "utf-8"));
				if (data.name) count++;
			} catch {}
		}
	}
	await walk(dir);
	return count;
}
async function countSkills(dir) {
	if (!await exists$1(dir)) return 0;
	let count = 0;
	try {
		const entries = await fs_promises.default.readdir(dir, { withFileTypes: true });
		for (const e of entries) if (e.isDirectory()) {
			if (await exists$1(path.default.join(dir, e.name, "SKILL.md"))) count++;
		}
	} catch {}
	return count;
}
var cachedProjects = null;
var lastScan = 0;
var CACHE_TTL = 6e4;
async function getProjects(forceRefresh = false) {
	if (!forceRefresh && cachedProjects && Date.now() - lastScan < CACHE_TTL) return cachedProjects;
	cachedProjects = await scanForProjects();
	lastScan = Date.now();
	return cachedProjects;
}
async function getProject(id) {
	return (await getProjects()).find((p) => p.id === id) ?? null;
}
async function getProjectAgents(projectId) {
	const project = await getProject(projectId);
	if (!project) return [];
	return findAgentsInDir(path.default.join(project.claudeDir, "agents"), project.id === "user" ? "user" : "project");
}
async function getProjectSkills(projectId) {
	const project = await getProject(projectId);
	if (!project) return [];
	return findSkillsInDir(path.default.join(project.claudeDir, "skills"), project.id === "user" ? "user" : "project");
}
async function getProjectHooks(projectId) {
	const project = await getProject(projectId);
	if (!project) return [];
	const settingsFile = path.default.join(project.claudeDir, "settings.json");
	if (!await exists$1(settingsFile)) return [];
	try {
		const raw = await fs_promises.default.readFile(settingsFile, "utf-8");
		return parseHooks(JSON.parse(raw).hooks || {});
	} catch {
		return [];
	}
}
function parseHooks(hooks) {
	const result = [];
	for (const [event, entries] of Object.entries(hooks)) {
		if (!Array.isArray(entries)) continue;
		for (const entry of entries) {
			const matcher = entry.matcher || "*";
			const hookList = entry.hooks || [];
			for (const hook of hookList) if (hook.type === "command" && hook.command) result.push({
				event,
				matcher,
				command: hook.command
			});
		}
	}
	return result;
}
async function findAgentsInDir(dir, scope) {
	if (!await exists$1(dir)) return [];
	const agents = [];
	async function walk(current) {
		const entries = await fs_promises.default.readdir(current, { withFileTypes: true });
		for (const entry of entries) {
			const full = path.default.join(current, entry.name);
			if (entry.isDirectory() && entry.name !== "memory") await walk(full);
			else if (entry.name.endsWith(".md")) try {
				const { data, content } = (0, gray_matter.default)(await fs_promises.default.readFile(full, "utf-8"));
				if (!data.name) continue;
				const fm = data;
				const relativePath = path.default.relative(dir, full);
				const folder = path.default.dirname(relativePath);
				const memoryFiles = await loadMemoryFiles(path.default.join(path.default.dirname(full), "memory"));
				const annexFiles = await loadAnnexFiles(path.default.dirname(full), entry.name);
				agents.push({
					id: fm.name,
					filePath: full,
					relativePath,
					folder: folder === "." ? "" : folder,
					frontmatter: fm,
					body: content.trim(),
					status: "created",
					subAgents: Array.isArray(fm.subAgents) && fm.subAgents.length > 0 ? fm.subAgents : extractSubAgents(content),
					memoryFiles,
					annexFiles
				});
			} catch {}
		}
	}
	await walk(dir);
	return agents;
}
async function findSkillsInDir(dir, scope) {
	if (!await exists$1(dir)) return [];
	const skills = [];
	try {
		const entries = await fs_promises.default.readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const skillDir = path.default.join(dir, entry.name);
			const skillFile = path.default.join(skillDir, "SKILL.md");
			if (!await exists$1(skillFile)) continue;
			try {
				const { data, content } = (0, gray_matter.default)(await fs_promises.default.readFile(skillFile, "utf-8"));
				const body = content.trim();
				const annexFiles = [];
				const dirEntries = await fs_promises.default.readdir(skillDir, { withFileTypes: true });
				for (const f of dirEntries) {
					if (f.name === "SKILL.md") continue;
					const full = path.default.join(skillDir, f.name);
					if (f.isDirectory()) annexFiles.push({
						name: f.name,
						path: full,
						size: 0,
						isDirectory: true
					});
					else {
						const stat = await fs_promises.default.stat(full);
						annexFiles.push({
							name: f.name,
							path: full,
							size: stat.size,
							isDirectory: false
						});
					}
				}
				skills.push({
					name: data.name || entry.name,
					description: data.description || "",
					filePath: skillFile,
					scope,
					body,
					lineCount: body.split("\n").length,
					license: data.license || void 0,
					metadata: data.metadata || void 0,
					annexFiles
				});
			} catch {}
		}
	} catch {}
	return skills;
}
async function loadMemoryFiles(memDir) {
	if (!await exists$1(memDir)) return [];
	const files = [];
	const entries = await fs_promises.default.readdir(memDir, { withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		const full = path.default.join(memDir, entry.name);
		const content = await fs_promises.default.readFile(full, "utf-8");
		const stat = await fs_promises.default.stat(full);
		files.push({
			name: entry.name,
			path: full,
			content,
			lastModified: stat.mtime.toISOString()
		});
	}
	return files;
}
async function loadAnnexFiles(agentDir, agentFileName) {
	const annexFiles = [];
	const entries = await fs_promises.default.readdir(agentDir, { withFileTypes: true });
	for (const entry of entries) if (entry.isFile() && entry.name !== ".DS_Store") {
		const full = path.default.join(agentDir, entry.name);
		const content = await fs_promises.default.readFile(full, "utf-8");
		annexFiles.push({
			name: entry.name,
			path: full,
			content,
			isEnv: entry.name === ".env"
		});
	}
	return annexFiles;
}
function extractSubAgents(body) {
	const agents = [];
	const pattern = /`(tw-[\w-]+)`/g;
	let match;
	while ((match = pattern.exec(body)) !== null) if (!agents.includes(match[1])) agents.push(match[1]);
	return agents;
}
//#endregion
//#region electron/services/links.service.ts
function getLinksForProject(projectId) {
	return getDb().prepare("SELECT agent_name FROM agent_project_links WHERE project_id = ?").all(projectId).map((r) => r.agent_name);
}
function linkAgent(agentName, projectId) {
	getDb().prepare("INSERT INTO agent_project_links (agent_name, project_id) VALUES (?, ?) ON CONFLICT DO NOTHING").run(agentName, projectId);
}
function unlinkAgent(agentName, projectId) {
	getDb().prepare("DELETE FROM agent_project_links WHERE agent_name = ? AND project_id = ?").run(agentName, projectId);
}
//#endregion
//#region electron/ipc/projects.ipc.ts
function registerProjectHandlers() {
	electron.ipcMain.handle("projects:list", (_e, forceRefresh) => getProjects(forceRefresh));
	electron.ipcMain.handle("projects:get", (_e, id) => getProject(id));
	electron.ipcMain.handle("projects:dashboard", async (_e, projectId) => {
		const project = await getProject(projectId);
		if (!project) return null;
		const [agents, skills, hooks] = await Promise.all([
			getProjectAgents(projectId),
			getProjectSkills(projectId),
			getProjectHooks(projectId)
		]);
		let linkedAgentNames = [];
		let userAgents = [];
		let userSkills = [];
		if (projectId !== "user") {
			linkedAgentNames = getLinksForProject(projectId);
			userAgents = await getProjectAgents("user");
			userSkills = await getProjectSkills("user");
		}
		const linkedSet = new Set(linkedAgentNames);
		const taggedUserAgents = userAgents.map((a) => ({
			...a,
			scope: "user",
			linked: linkedSet.has(a.id)
		}));
		return {
			project,
			agents: [...agents.map((a) => ({
				...a,
				scope: "project",
				linked: true
			})), ...taggedUserAgents],
			skills: [...skills, ...userSkills.map((s) => ({
				...s,
				scope: "user"
			}))],
			hooks
		};
	});
	electron.ipcMain.handle("links:list", (_e, projectId) => getLinksForProject(projectId));
	electron.ipcMain.handle("links:add", async (_e, agentName, projectId) => {
		const userAgents = await getProjectAgents("user");
		const agent = userAgents.find((a) => a.id === agentName);
		linkAgent(agentName, projectId);
		if (agent && agent.subAgents.length > 0) {
			const existingIds = new Set(userAgents.map((a) => a.id));
			for (const sub of agent.subAgents) if (existingIds.has(sub)) linkAgent(sub, projectId);
		}
	});
	electron.ipcMain.handle("links:remove", async (_e, agentName, projectId) => {
		const agent = (await getProjectAgents("user")).find((a) => a.id === agentName);
		unlinkAgent(agentName, projectId);
		if (agent && agent.subAgents.length > 0) for (const sub of agent.subAgents) unlinkAgent(sub, projectId);
	});
}
//#endregion
//#region electron/services/broadcast.ts
function broadcast(data) {
	for (const win of electron.BrowserWindow.getAllWindows()) win.webContents.send("push-event", data);
}
//#endregion
//#region electron/services/events.service.ts
function ingestEvent(event) {
	const db = getDb();
	db.prepare(`INSERT INTO events (agent_name, session_id, event_type, tool_name, payload, tokens_in, tokens_out, cost_usd)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(event.agent_name, event.session_id || null, event.event_type, event.tool_name || null, JSON.stringify(event.payload || {}), event.tokens_in || 0, event.tokens_out || 0, event.cost_usd || 0);
	const stored = db.prepare("SELECT * FROM events WHERE id = last_insert_rowid()").get();
	if (event.session_id) db.prepare(`UPDATE missions SET
        tokens_in_total = tokens_in_total + ?,
        tokens_out_total = tokens_out_total + ?,
        cost_usd_total = cost_usd_total + ?,
        events_count = events_count + 1
       WHERE session_id = ?`).run(event.tokens_in || 0, event.tokens_out || 0, event.cost_usd || 0, event.session_id);
	if (event.event_type === "Stop" && event.session_id) db.prepare(`UPDATE missions SET status = 'done', finished_at = datetime('now') WHERE session_id = ? AND status = 'running'`).run(event.session_id);
	broadcast({
		type: "event",
		...stored
	});
	return stored;
}
function getRecentEvents(limit = 50) {
	return getDb().prepare("SELECT * FROM events ORDER BY created_at DESC LIMIT ?").all(limit);
}
function getEventsByAgent(agentName, limit = 50) {
	return getDb().prepare("SELECT * FROM events WHERE agent_name = ? ORDER BY created_at DESC LIMIT ?").all(agentName, limit);
}
function getStats() {
	return getDb().prepare(`SELECT
      COUNT(DISTINCT CASE WHEN event_type != 'Stop' THEN session_id END) AS active_sessions,
      COUNT(*) AS total_events,
      COALESCE(SUM(tokens_in), 0) AS total_tokens_in,
      COALESCE(SUM(tokens_out), 0) AS total_tokens_out,
      COALESCE(SUM(cost_usd), 0) AS total_cost,
      SUM(CASE WHEN created_at > datetime('now', '-1 day') THEN 1 ELSE 0 END) AS events_today,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-1 day') THEN cost_usd ELSE 0 END), 0) AS cost_today
    FROM events`).get();
}
function getStatsPerAgent() {
	return getDb().prepare(`SELECT
      agent_name,
      COUNT(*) AS events_count,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      MAX(created_at) AS last_active
    FROM events
    GROUP BY agent_name
    ORDER BY cost_usd DESC`).all();
}
//#endregion
//#region electron/services/spawn.service.ts
var sessions = /* @__PURE__ */ new Map();
function parseStreamLine(line) {
	try {
		return JSON.parse(line);
	} catch {
		return null;
	}
}
function extractText(event) {
	if (event.message?.content) return event.message.content.filter((c) => c.type === "text" && c.text).map((c) => c.text).join("");
	if (event.content) return event.content.filter((c) => c.type === "text" && c.text).map((c) => c.text).join("");
	return null;
}
function spawnAgent(agentName, mission, cwd, resumeSessionId) {
	const sessionId = (0, crypto.randomUUID)();
	const args = [
		"--print",
		"--output-format",
		"stream-json",
		"--verbose",
		"--max-turns",
		"50"
	];
	if (resumeSessionId) args.push("--resume", resumeSessionId);
	else if (agentName && agentName !== "_main") args.push("--agent", agentName);
	args.push(mission);
	const proc = (0, child_process.spawn)("claude", args, {
		stdio: [
			"pipe",
			"pipe",
			"pipe"
		],
		cwd: cwd || process.cwd(),
		env: {
			...process.env,
			FORCE_COLOR: "0"
		}
	});
	const session = {
		id: sessionId,
		agentName,
		mission,
		status: "running",
		pid: proc.pid || null,
		startedAt: (/* @__PURE__ */ new Date()).toISOString(),
		messages: [{
			role: "user",
			content: mission,
			timestamp: (/* @__PURE__ */ new Date()).toISOString()
		}],
		claudeSessionId: resumeSessionId
	};
	broadcast({
		type: "spawn_message",
		sessionId,
		agentName,
		message: session.messages[0]
	});
	let buffer = "";
	proc.stdout?.on("data", (chunk) => {
		buffer += chunk.toString();
		const lines = buffer.split("\n");
		buffer = lines.pop() || "";
		for (const line of lines) {
			if (!line.trim()) continue;
			const event = parseStreamLine(line);
			if (!event) continue;
			if (event.session_id && !session.claudeSessionId) {
				session.claudeSessionId = event.session_id;
				broadcast({
					type: "spawn_claude_session",
					sessionId,
					claudeSessionId: event.session_id
				});
			}
			handleStreamEvent(sessionId, session, event);
		}
	});
	proc.stderr?.on("data", (chunk) => {
		const text = chunk.toString().trim();
		if (text) broadcast({
			type: "spawn_stderr",
			sessionId,
			agentName,
			text
		});
	});
	proc.on("close", (code) => {
		session.status = code === 0 ? "done" : "failed";
		session.pid = null;
		broadcast({
			type: "spawn_exit",
			sessionId,
			agentName,
			code,
			status: session.status,
			claudeSessionId: session.claudeSessionId
		});
		try {
			ingestEvent({
				agent_name: agentName,
				session_id: sessionId,
				event_type: "Stop",
				payload: { exit_code: code }
			});
		} catch {}
	});
	sessions.set(sessionId, {
		session,
		process: proc
	});
	try {
		ingestEvent({
			agent_name: agentName,
			session_id: sessionId,
			event_type: "SubagentStart",
			payload: { mission }
		});
	} catch {}
	broadcast({
		type: "spawn_start",
		sessionId,
		agentName,
		mission
	});
	return session;
}
function handleStreamEvent(sessionId, session, event) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	if (event.type === "assistant") {
		const text = extractText(event);
		if (text) {
			const msg = {
				role: "assistant",
				content: text,
				timestamp: now
			};
			session.messages.push(msg);
			broadcast({
				type: "spawn_message",
				sessionId,
				agentName: session.agentName,
				message: msg
			});
		}
	}
	if (event.type === "tool_use") {
		const toolName = event.name || "unknown";
		const msg = {
			role: "tool",
			content: JSON.stringify(event.input || {}, null, 2),
			toolName,
			timestamp: now
		};
		session.messages.push(msg);
		broadcast({
			type: "spawn_message",
			sessionId,
			agentName: session.agentName,
			message: msg
		});
		try {
			ingestEvent({
				agent_name: session.agentName,
				session_id: sessionId,
				event_type: "PreToolUse",
				tool_name: toolName
			});
		} catch {}
	}
	if (event.type === "tool_result") try {
		ingestEvent({
			agent_name: session.agentName,
			session_id: sessionId,
			event_type: "PostToolUse",
			tool_name: event.name || void 0
		});
	} catch {}
	if (event.type === "result") {
		const text = extractText(event);
		if (text) {
			const msg = {
				role: "assistant",
				content: text,
				timestamp: now
			};
			session.messages.push(msg);
			broadcast({
				type: "spawn_message",
				sessionId,
				agentName: session.agentName,
				message: msg
			});
		}
	}
	const usage = event.usage || event.message?.usage;
	if (usage) {
		const tokensIn = usage.input_tokens || 0;
		const tokensOut = usage.output_tokens || 0;
		broadcast({
			type: "spawn_usage",
			sessionId,
			agentName: session.agentName,
			tokensIn,
			tokensOut,
			model: event.model || void 0
		});
		try {
			ingestEvent({
				agent_name: session.agentName,
				session_id: sessionId,
				event_type: "Usage",
				tokens_in: tokensIn,
				tokens_out: tokensOut
			});
		} catch {}
	}
	if (event.type === "input_request" || event.subtype === "input_request") broadcast({
		type: "spawn_input_request",
		sessionId,
		agentName: session.agentName
	});
}
function sendInput(sessionId, text) {
	const entry = sessions.get(sessionId);
	if (!entry || !entry.process.stdin?.writable) return false;
	entry.process.stdin.write(text + "\n");
	entry.session.messages.push({
		role: "user",
		content: text,
		timestamp: (/* @__PURE__ */ new Date()).toISOString()
	});
	broadcast({
		type: "spawn_message",
		sessionId,
		agentName: entry.session.agentName,
		message: {
			role: "user",
			content: text,
			timestamp: (/* @__PURE__ */ new Date()).toISOString()
		}
	});
	return true;
}
function killSession(sessionId) {
	const entry = sessions.get(sessionId);
	if (!entry) return false;
	entry.process.kill("SIGTERM");
	setTimeout(() => {
		if (entry.process.exitCode === null) entry.process.kill("SIGKILL");
	}, 5e3);
	return true;
}
function getSession(sessionId) {
	return sessions.get(sessionId)?.session || null;
}
function getActiveSessions() {
	return Array.from(sessions.values()).map((e) => e.session).filter((s) => s.status === "running");
}
function getAllSessions() {
	return Array.from(sessions.values()).map((e) => e.session);
}
//#endregion
//#region electron/ipc/spawn.ipc.ts
function registerSpawnHandlers() {
	electron.ipcMain.handle("spawn:list", () => getAllSessions());
	electron.ipcMain.handle("spawn:active", () => getActiveSessions());
	electron.ipcMain.handle("spawn:start", (_e, opts) => spawnAgent(opts.agent_name || "_main", opts.mission, opts.cwd, opts.resume_session_id));
	electron.ipcMain.handle("spawn:get", (_e, sessionId) => getSession(sessionId));
	electron.ipcMain.handle("spawn:input", (_e, sessionId, text) => sendInput(sessionId, text));
	electron.ipcMain.handle("spawn:kill", (_e, sessionId) => killSession(sessionId));
}
//#endregion
//#region electron/ipc/events.ipc.ts
function registerEventHandlers() {
	electron.ipcMain.handle("events:recent", (_e, limit) => getRecentEvents(limit));
	electron.ipcMain.handle("events:by-agent", (_e, agentName, limit) => getEventsByAgent(agentName, limit));
	electron.ipcMain.handle("events:stats", () => getStats());
	electron.ipcMain.handle("events:stats-per-agent", () => getStatsPerAgent());
	electron.ipcMain.handle("events:ingest", (_e, event) => ingestEvent(event));
}
//#endregion
//#region electron/services/memory.service.ts
var HOME$1 = process.env.HOME;
var PROJECTS_MEMORY_BASE = path.default.join(HOME$1, ".claude", "projects");
async function exists(p) {
	try {
		await fs_promises.default.access(p);
		return true;
	} catch {
		return false;
	}
}
function resolveProjectMemoryDir(projectPath) {
	const normalized = projectPath.replace(/\//g, "-").replace(/^-/, "");
	return path.default.join(PROJECTS_MEMORY_BASE, normalized, "memory");
}
async function getProjectMemory(projectPath) {
	const memDir = resolveProjectMemoryDir(projectPath);
	if (!await exists(memDir)) return [];
	const entries = await fs_promises.default.readdir(memDir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		const full = path.default.join(memDir, entry.name);
		const content = await fs_promises.default.readFile(full, "utf-8");
		const stat = await fs_promises.default.stat(full);
		files.push({
			name: entry.name,
			path: full,
			content,
			lastModified: stat.mtime.toISOString(),
			lines: content.split("\n").length,
			bytes: Buffer.byteLength(content, "utf-8")
		});
	}
	return files;
}
async function updateProjectMemoryFile(projectPath, fileName, content) {
	const memDir = resolveProjectMemoryDir(projectPath);
	await fs_promises.default.mkdir(memDir, { recursive: true });
	const full = path.default.join(memDir, fileName);
	await fs_promises.default.writeFile(full, content, "utf-8");
	return {
		name: fileName,
		path: full,
		content,
		lastModified: (await fs_promises.default.stat(full)).mtime.toISOString(),
		lines: content.split("\n").length,
		bytes: Buffer.byteLength(content, "utf-8")
	};
}
async function deleteProjectMemoryFile(projectPath, fileName) {
	const memDir = resolveProjectMemoryDir(projectPath);
	const full = path.default.join(memDir, fileName);
	if (await exists(full)) await fs_promises.default.unlink(full);
}
//#endregion
//#region electron/ipc/memory.ipc.ts
function registerMemoryHandlers() {
	electron.ipcMain.handle("memory:list", async (_e, projectId) => {
		const project = await getProject(projectId);
		if (!project) return [];
		return getProjectMemory(project.path);
	});
	electron.ipcMain.handle("memory:update", async (_e, projectId, fileName, content) => {
		const project = await getProject(projectId);
		if (!project) throw new Error("Project not found");
		return updateProjectMemoryFile(project.path, fileName, content);
	});
	electron.ipcMain.handle("memory:delete", async (_e, projectId, fileName) => {
		const project = await getProject(projectId);
		if (!project) throw new Error("Project not found");
		return deleteProjectMemoryFile(project.path, fileName);
	});
}
//#endregion
//#region electron/services/costs.service.ts
function getCostsByDay(days = 30) {
	return getDb().prepare(`SELECT
      DATE(created_at) AS day,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      COUNT(*) AS events_count
    FROM events
    WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY DATE(created_at)
    ORDER BY day ASC`).all(days);
}
function getCostsByAgent(days = 30) {
	return getDb().prepare(`SELECT
      agent_name,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      COUNT(*) AS events_count,
      COUNT(DISTINCT DATE(created_at)) AS active_days,
      MIN(created_at) AS first_seen,
      MAX(created_at) AS last_seen
    FROM events
    WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY agent_name
    ORDER BY cost_usd DESC`).all(days);
}
function getCostsByAgentPerDay(days = 30) {
	return getDb().prepare(`SELECT
      DATE(created_at) AS day,
      agent_name,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd
    FROM events
    WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY DATE(created_at), agent_name
    ORDER BY day ASC, cost_usd DESC`).all(days);
}
function getCostsByTool(days = 30) {
	return getDb().prepare(`SELECT
      COALESCE(tool_name, 'unknown') AS tool_name,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      COUNT(*) AS call_count
    FROM events
    WHERE tool_name IS NOT NULL
      AND created_at > datetime('now', '-' || ? || ' days')
    GROUP BY tool_name
    ORDER BY cost_usd DESC`).all(days);
}
function getCostsSummary() {
	return getDb().prepare(`SELECT
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-1 day') THEN tokens_in ELSE 0 END), 0) AS tokens_in_today,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-1 day') THEN tokens_out ELSE 0 END), 0) AS tokens_out_today,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-1 day') THEN cost_usd ELSE 0 END), 0) AS cost_today,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-7 days') THEN tokens_in ELSE 0 END), 0) AS tokens_in_7d,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-7 days') THEN tokens_out ELSE 0 END), 0) AS tokens_out_7d,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-7 days') THEN cost_usd ELSE 0 END), 0) AS cost_7d,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN tokens_in ELSE 0 END), 0) AS tokens_in_30d,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN tokens_out ELSE 0 END), 0) AS tokens_out_30d,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN cost_usd ELSE 0 END), 0) AS cost_30d,
      COALESCE(SUM(tokens_in), 0) AS tokens_in_all,
      COALESCE(SUM(tokens_out), 0) AS tokens_out_all,
      COALESCE(SUM(cost_usd), 0) AS cost_all
    FROM events`).get();
}
//#endregion
//#region electron/ipc/costs.ipc.ts
function registerCostHandlers() {
	electron.ipcMain.handle("costs:summary", () => getCostsSummary());
	electron.ipcMain.handle("costs:by-day", (_e, days) => getCostsByDay(days));
	electron.ipcMain.handle("costs:by-agent", (_e, days) => getCostsByAgent(days));
	electron.ipcMain.handle("costs:by-agent-day", (_e, days) => getCostsByAgentPerDay(days));
	electron.ipcMain.handle("costs:by-tool", (_e, days) => getCostsByTool(days));
}
//#endregion
//#region electron/services/favorites.service.ts
function getFavorites(projectId) {
	return getDb().prepare("SELECT item_type, item_name FROM favorites WHERE project_id = ? ORDER BY created_at ASC").all(projectId);
}
function addFavorite(projectId, itemType, itemName) {
	getDb().prepare("INSERT INTO favorites (item_type, item_name, project_id) VALUES (?, ?, ?) ON CONFLICT DO NOTHING").run(itemType, itemName, projectId);
}
function removeFavorite(projectId, itemType, itemName) {
	getDb().prepare("DELETE FROM favorites WHERE item_type = ? AND item_name = ? AND project_id = ?").run(itemType, itemName, projectId);
}
//#endregion
//#region electron/ipc/favorites.ipc.ts
function registerFavoriteHandlers() {
	electron.ipcMain.handle("favorites:list", (_e, projectId) => getFavorites(projectId));
	electron.ipcMain.handle("favorites:add", (_e, projectId, itemType, itemName) => addFavorite(projectId, itemType, itemName));
	electron.ipcMain.handle("favorites:remove", (_e, projectId, itemType, itemName) => removeFavorite(projectId, itemType, itemName));
}
//#endregion
//#region electron/services/missions.service.ts
function createMission(agentName, title, sessionId) {
	getDb().prepare("INSERT INTO missions (agent_name, title, session_id) VALUES (?, ?, ?)").run(agentName, title, sessionId || null);
	return getDb().prepare("SELECT * FROM missions WHERE id = last_insert_rowid()").get();
}
function getMissions(limit = 50, status) {
	if (status) return getDb().prepare("SELECT * FROM missions WHERE status = ? ORDER BY started_at DESC LIMIT ?").all(status, limit);
	return getDb().prepare("SELECT * FROM missions ORDER BY started_at DESC LIMIT ?").all(limit);
}
function getMission(id) {
	return getDb().prepare("SELECT * FROM missions WHERE id = ?").get(id) || null;
}
function getMissionEvents(id) {
	const mission = getMission(id);
	if (!mission?.session_id) return [];
	return getDb().prepare("SELECT * FROM events WHERE session_id = ? ORDER BY created_at ASC").all(mission.session_id);
}
//#endregion
//#region electron/ipc/missions.ipc.ts
function registerMissionHandlers() {
	electron.ipcMain.handle("missions:list", (_e, limit, status) => getMissions(limit, status));
	electron.ipcMain.handle("missions:get", (_e, id) => getMission(id));
	electron.ipcMain.handle("missions:events", (_e, id) => getMissionEvents(id));
	electron.ipcMain.handle("missions:create", (_e, agentName, title, sessionId) => createMission(agentName, title, sessionId));
}
//#endregion
//#region electron/services/session.service.ts
var HOME = process.env.HOME || require("os").homedir();
var PROJECTS_BASE = path.default.join(HOME, ".claude", "projects");
function getSessionsDir(projectPath) {
	const encoded = projectPath.replace(/\//g, "-");
	return path.default.join(PROJECTS_BASE, encoded);
}
async function extractMetadata(filePath) {
	const meta = {};
	let lineCount = 0;
	return new Promise((resolve) => {
		const stream = fs.default.createReadStream(filePath, { encoding: "utf-8" });
		const rl = readline.default.createInterface({
			input: stream,
			crlfDelay: Infinity
		});
		rl.on("line", (line) => {
			lineCount++;
			try {
				const obj = JSON.parse(line);
				if (obj.type === "ai-title" && obj.aiTitle) meta.title = obj.aiTitle;
				if (obj.type === "agent-setting" && obj.agentSetting) meta.agentName = obj.agentSetting;
				if (obj.type === "user" && obj.promptId && !meta.firstPrompt) {
					const content = obj.message?.content;
					if (typeof content === "string") meta.firstPrompt = content.length > 120 ? content.slice(0, 120) + "…" : content;
					if (obj.timestamp && !meta.startedAt) meta.startedAt = obj.timestamp;
					if (obj.gitBranch && !meta.branch) meta.branch = obj.gitBranch;
				}
				if (obj.type === "assistant" && obj.message?.model && !meta.model) meta.model = obj.message.model;
			} catch {}
			if (lineCount >= 200) {
				rl.close();
				stream.destroy();
			}
		});
		rl.on("close", () => {
			if (!meta.title && meta.firstPrompt) {
				let fallback = meta.firstPrompt.replace(/[\n\r]+/g, " ").replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/^#+\s+/, "").trim();
				const sentenceEnd = fallback.search(/[.!?]\s/);
				if (sentenceEnd > 0 && sentenceEnd < 60) fallback = fallback.slice(0, sentenceEnd + 1);
				else if (fallback.length > 60) fallback = fallback.slice(0, 57) + "...";
				meta.title = fallback;
			}
			resolve(meta);
		});
		rl.on("error", () => resolve(meta));
	});
}
async function listSessions(projectPath) {
	const dir = getSessionsDir(projectPath);
	if (!fs.default.existsSync(dir)) return [];
	const entries = fs.default.readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
	const summaries = [];
	for (const entry of entries) {
		const filePath = path.default.join(dir, entry);
		const sessionId = entry.replace(".jsonl", "");
		let stat;
		try {
			stat = fs.default.statSync(filePath);
		} catch {
			continue;
		}
		const meta = await extractMetadata(filePath);
		summaries.push({
			sessionId,
			filePath,
			agentName: meta.agentName || null,
			title: meta.title || null,
			firstPrompt: meta.firstPrompt || null,
			messageCount: Math.max(1, Math.round(stat.size / 500)),
			branch: meta.branch || null,
			startedAt: meta.startedAt || null,
			lastActiveAt: stat.mtime.toISOString(),
			model: meta.model || null,
			projectDirName: path.default.basename(dir)
		});
	}
	return summaries.sort((a, b) => {
		const ta = a.lastActiveAt || "";
		return (b.lastActiveAt || "").localeCompare(ta);
	});
}
async function loadConversation(filePath) {
	const sessionId = path.default.basename(filePath, ".jsonl");
	const messages = [];
	let totalTokensIn = 0;
	let totalTokensOut = 0;
	let model = null;
	return new Promise((resolve) => {
		if (!fs.default.existsSync(filePath)) {
			resolve({
				sessionId,
				messages,
				totalTokensIn,
				totalTokensOut,
				model
			});
			return;
		}
		const stream = fs.default.createReadStream(filePath, { encoding: "utf-8" });
		const rl = readline.default.createInterface({
			input: stream,
			crlfDelay: Infinity
		});
		const pendingToolNames = [];
		rl.on("line", (line) => {
			try {
				const obj = JSON.parse(line);
				if (obj.type === "user" && obj.promptId && obj.message) {
					const content = obj.message.content;
					if (typeof content === "string") messages.push({
						role: "user",
						content,
						timestamp: obj.timestamp || "",
						uuid: obj.uuid || ""
					});
				}
				if (obj.type === "assistant" && obj.message) {
					const contentArr = obj.message.content || [];
					const textParts = [];
					const toolNames = [];
					for (const c of contentArr) {
						if (c.type === "text" && c.text) textParts.push(c.text);
						if (c.type === "tool_use" && c.name) toolNames.push(c.name);
					}
					const usage = obj.message.usage;
					const tokensIn = usage?.input_tokens || 0;
					const tokensOut = usage?.output_tokens || 0;
					if (textParts.length > 0 || toolNames.length > 0) {
						totalTokensIn += tokensIn;
						totalTokensOut += tokensOut;
						if (obj.message.model && !model) model = obj.message.model;
					}
					if (textParts.length === 0 && toolNames.length > 0) pendingToolNames.push(...toolNames);
					else if (textParts.length > 0) {
						const combinedTools = [...pendingToolNames, ...toolNames];
						pendingToolNames.length = 0;
						messages.push({
							role: "assistant",
							content: textParts.join("\n"),
							timestamp: obj.timestamp || "",
							uuid: obj.uuid || "",
							model: obj.message.model,
							tokensIn,
							tokensOut,
							toolNames: combinedTools.length > 0 ? combinedTools : void 0
						});
					}
				}
			} catch {}
		});
		rl.on("close", () => {
			if (pendingToolNames.length > 0) messages.push({
				role: "assistant",
				content: "",
				timestamp: "",
				uuid: "",
				toolNames: pendingToolNames
			});
			resolve({
				sessionId,
				messages,
				totalTokensIn,
				totalTokensOut,
				model
			});
		});
		rl.on("error", (_err) => {
			resolve({
				sessionId,
				messages,
				totalTokensIn,
				totalTokensOut,
				model
			});
		});
	});
}
var watchers = /* @__PURE__ */ new Map();
var fileOffsets = /* @__PURE__ */ new Map();
var sessionAgentCache = /* @__PURE__ */ new Map();
function getAgentForFile(filePath) {
	if (sessionAgentCache.has(filePath)) return sessionAgentCache.get(filePath);
	try {
		const lines = fs.default.readFileSync(filePath, "utf-8").split("\n").slice(0, 20);
		for (const line of lines) {
			if (!line.trim()) continue;
			try {
				const obj = JSON.parse(line);
				if (obj.type === "agent-setting" && obj.agentSetting) {
					sessionAgentCache.set(filePath, obj.agentSetting);
					return obj.agentSetting;
				}
			} catch {}
		}
	} catch {}
	sessionAgentCache.set(filePath, "unknown");
	return "unknown";
}
function startWatching(projectPath) {
	const dir = getSessionsDir(projectPath);
	if (!fs.default.existsSync(dir)) return;
	if (watchers.has(dir)) return;
	const files = fs.default.readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
	for (const f of files) {
		const fp = path.default.join(dir, f);
		try {
			const stat = fs.default.statSync(fp);
			fileOffsets.set(fp, stat.size);
		} catch {}
	}
	const watcher = fs.default.watch(dir, (_, filename) => {
		if (!filename || !filename.endsWith(".jsonl")) return;
		const fp = path.default.join(dir, filename);
		try {
			const stat = fs.default.statSync(fp);
			const lastOffset = fileOffsets.get(fp) || 0;
			if (stat.size > lastOffset) {
				const stream = fs.default.createReadStream(fp, {
					start: lastOffset,
					encoding: "utf-8"
				});
				let buffer = "";
				stream.on("data", (chunk) => {
					buffer += chunk;
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";
					for (const line of lines) {
						if (!line.trim()) continue;
						try {
							processNewLine(JSON.parse(line), fp);
						} catch {}
					}
				});
				stream.on("end", () => {
					fileOffsets.set(fp, stat.size);
				});
			} else if (lastOffset === 0) fileOffsets.set(fp, stat.size);
		} catch {}
	});
	watchers.set(dir, watcher);
}
function processNewLine(obj, filePath) {
	const agentName = getAgentForFile(filePath);
	const sessionId = obj.sessionId || null;
	if (obj.type === "assistant" && obj.message) {
		const msg = obj.message;
		const usage = msg.usage;
		broadcast({
			type: "session_activity",
			sessionId,
			agentName,
			tokensIn: usage?.input_tokens || 0,
			tokensOut: usage?.output_tokens || 0,
			model: msg.model || void 0
		});
	}
	if (obj.type === "user" && obj.promptId) broadcast({
		type: "session_activity",
		sessionId,
		agentName,
		event: "user_prompt"
	});
}
function stopWatching(projectPath) {
	const dir = getSessionsDir(projectPath);
	const watcher = watchers.get(dir);
	if (watcher) {
		watcher.close();
		watchers.delete(dir);
	}
	for (const key of fileOffsets.keys()) if (key.startsWith(dir)) fileOffsets.delete(key);
	for (const key of sessionAgentCache.keys()) if (key.startsWith(dir)) sessionAgentCache.delete(key);
}
//#endregion
//#region electron/ipc/sessions.ipc.ts
function registerSessionHandlers() {
	electron.ipcMain.handle("sessions:list", (_e, projectPath) => listSessions(projectPath));
	electron.ipcMain.handle("sessions:conversation", (_e, filePath) => loadConversation(filePath));
	electron.ipcMain.handle("sessions:watch-start", (_e, projectPath) => startWatching(projectPath));
	electron.ipcMain.handle("sessions:watch-stop", (_e, projectPath) => stopWatching(projectPath));
}
//#endregion
//#region electron/ipc/dialog.ipc.ts
function registerDialogHandlers() {
	electron.ipcMain.handle("dialog:open-file", async () => {
		const win = electron.BrowserWindow.getFocusedWindow();
		const result = await electron.dialog.showOpenDialog(win, {
			properties: ["openFile", "multiSelections"],
			filters: [{
				name: "All Files",
				extensions: ["*"]
			}, {
				name: "Images",
				extensions: [
					"png",
					"jpg",
					"jpeg",
					"webp",
					"gif",
					"svg"
				]
			}]
		});
		if (result.canceled) return [];
		return result.filePaths;
	});
	electron.ipcMain.handle("dialog:read-image", async (_e, filePath) => {
		try {
			if (!fs.default.existsSync(filePath)) return null;
			const data = fs.default.readFileSync(filePath);
			return `data:${{
				".png": "image/png",
				".jpg": "image/jpeg",
				".jpeg": "image/jpeg",
				".gif": "image/gif",
				".svg": "image/svg+xml",
				".webp": "image/webp"
			}[path.default.extname(filePath).toLowerCase()] || "application/octet-stream"};base64,${data.toString("base64")}`;
		} catch {
			return null;
		}
	});
	electron.ipcMain.handle("dialog:generate-title", async (_e, userMessage, assistantMessage) => {
		const prompt = `Generate a concise title (3-6 words max) for this conversation. Reply ONLY with the title, nothing else — no quotes, no period, no explanation.

User: ${userMessage.slice(0, 200)}
Assistant: ${assistantMessage.slice(0, 200)}`;
		return new Promise((resolve) => {
			const proc = (0, child_process.exec)("claude --print --max-turns 1", {
				timeout: 15e3,
				encoding: "utf-8",
				env: { ...process.env }
			}, (error, stdout) => {
				if (error || !stdout.trim()) {
					let fallback = userMessage.replace(/[\n\r]+/g, " ").trim();
					if (fallback.length > 50) fallback = fallback.slice(0, 47) + "...";
					resolve(fallback);
				} else resolve(stdout.trim().slice(0, 60));
			});
			proc.stdin?.write(prompt);
			proc.stdin?.end();
		});
	});
}
//#endregion
//#region electron/ipc/index.ts
function registerAllHandlers() {
	registerAgentHandlers();
	registerProjectHandlers();
	registerSpawnHandlers();
	registerEventHandlers();
	registerMemoryHandlers();
	registerCostHandlers();
	registerFavoriteHandlers();
	registerMissionHandlers();
	registerSessionHandlers();
	registerDialogHandlers();
}
//#endregion
//#region electron/main.ts
var mainWindow = null;
function createWindow() {
	mainWindow = new electron.BrowserWindow({
		width: 1400,
		height: 900,
		minWidth: 900,
		minHeight: 600,
		titleBarStyle: "hiddenInset",
		backgroundColor: "#030712",
		webPreferences: {
			preload: path.default.join(__dirname, "../preload/preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false
		}
	});
	if (process.env.ELECTRON_RENDERER_URL) mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
	else mainWindow.loadFile(path.default.join(__dirname, "../../out/renderer/index.html"));
	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}
electron.app.whenReady().then(async () => {
	await initDb();
	registerAllHandlers();
	createWindow();
	electron.app.on("activate", () => {
		if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
electron.app.on("window-all-closed", () => {
	if (process.platform !== "darwin") electron.app.quit();
});
//#endregion
