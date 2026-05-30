"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Push Prisma schema to Turso database.
 *
 * Run this on your LOCAL machine (where internet works):
 *   pnpm tsx scripts/push-to-turso.ts
 *
 * Make sure your .env has the TURSO values set:
 *   DATABASE_URL="libsql://x-clone-cursed-coder.aws-ap-south-1.turso.io"
 *   TURSO_AUTH_TOKEN="eyJhbGciOi...<your-token>"
 */
var client_1 = require("@libsql/client");
require("dotenv/config");
var sql = "\n-- CreateTable\nCREATE TABLE IF NOT EXISTS \"User\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"name\" TEXT NOT NULL,\n    \"email\" TEXT NOT NULL,\n    \"emailVerified\" DATETIME,\n    \"image\" TEXT,\n    \"bannerUrl\" TEXT,\n    \"username\" TEXT NOT NULL,\n    \"bio\" TEXT,\n    \"password\" TEXT,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    \"updatedAt\" DATETIME NOT NULL\n);\nCREATE UNIQUE INDEX IF NOT EXISTS \"User_email_key\" ON \"User\"(\"email\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"User_username_key\" ON \"User\"(\"username\");\nCREATE TABLE IF NOT EXISTS \"Post\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"content\" TEXT NOT NULL,\n    \"imageUrl\" TEXT,\n    \"authorId\" TEXT NOT NULL,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    \"updatedAt\" DATETIME NOT NULL,\n    FOREIGN KEY (\"authorId\") REFERENCES \"User\"(\"id\")\n);\nCREATE TABLE IF NOT EXISTS \"Like\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"userId\" TEXT NOT NULL,\n    \"postId\" TEXT NOT NULL,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    FOREIGN KEY (\"userId\") REFERENCES \"User\"(\"id\"),\n    FOREIGN KEY (\"postId\") REFERENCES \"Post\"(\"id\")\n);\nCREATE UNIQUE INDEX IF NOT EXISTS \"Like_userId_postId_key\" ON \"Like\"(\"userId\", \"postId\");\nCREATE TABLE IF NOT EXISTS \"Bookmark\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"userId\" TEXT NOT NULL,\n    \"postId\" TEXT NOT NULL,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    FOREIGN KEY (\"userId\") REFERENCES \"User\"(\"id\"),\n    FOREIGN KEY (\"postId\") REFERENCES \"Post\"(\"id\")\n);\nCREATE UNIQUE INDEX IF NOT EXISTS \"Bookmark_userId_postId_key\" ON \"Bookmark\"(\"userId\", \"postId\");\nCREATE TABLE IF NOT EXISTS \"Repost\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"userId\" TEXT NOT NULL,\n    \"postId\" TEXT NOT NULL,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    FOREIGN KEY (\"userId\") REFERENCES \"User\"(\"id\"),\n    FOREIGN KEY (\"postId\") REFERENCES \"Post\"(\"id\")\n);\nCREATE UNIQUE INDEX IF NOT EXISTS \"Repost_userId_postId_key\" ON \"Repost\"(\"userId\", \"postId\");\nCREATE TABLE IF NOT EXISTS \"Comment\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"content\" TEXT NOT NULL,\n    \"userId\" TEXT NOT NULL,\n    \"postId\" TEXT NOT NULL,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    FOREIGN KEY (\"userId\") REFERENCES \"User\"(\"id\"),\n    FOREIGN KEY (\"postId\") REFERENCES \"Post\"(\"id\")\n);\nCREATE TABLE IF NOT EXISTS \"Follow\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"followerId\" TEXT NOT NULL,\n    \"followingId\" TEXT NOT NULL,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    FOREIGN KEY (\"followerId\") REFERENCES \"User\"(\"id\"),\n    FOREIGN KEY (\"followingId\") REFERENCES \"User\"(\"id\")\n);\nCREATE UNIQUE INDEX IF NOT EXISTS \"Follow_followerId_followingId_key\" ON \"Follow\"(\"followerId\", \"followingId\");\nCREATE TABLE IF NOT EXISTS \"Account\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"userId\" TEXT NOT NULL,\n    \"type\" TEXT NOT NULL,\n    \"provider\" TEXT NOT NULL,\n    \"providerAccountId\" TEXT NOT NULL,\n    \"refresh_token\" TEXT,\n    \"access_token\" TEXT,\n    \"expires_at\" INTEGER,\n    \"token_type\" TEXT,\n    \"scope\" TEXT,\n    \"id_token\" TEXT,\n    \"session_state\" TEXT,\n    FOREIGN KEY (\"userId\") REFERENCES \"User\"(\"id\")\n);\nCREATE UNIQUE INDEX IF NOT EXISTS \"Account_provider_providerAccountId_key\" ON \"Account\"(\"provider\", \"providerAccountId\");\nCREATE TABLE IF NOT EXISTS \"Session\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"sessionToken\" TEXT NOT NULL,\n    \"userId\" TEXT NOT NULL,\n    \"expires\" DATETIME NOT NULL,\n    FOREIGN KEY (\"userId\") REFERENCES \"User\"(\"id\")\n);\nCREATE UNIQUE INDEX IF NOT EXISTS \"Session_sessionToken_key\" ON \"Session\"(\"sessionToken\");\nCREATE TABLE IF NOT EXISTS \"VerificationToken\" (\n    \"identifier\" TEXT NOT NULL,\n    \"token\" TEXT NOT NULL,\n    \"expires\" DATETIME NOT NULL\n);\nCREATE UNIQUE INDEX IF NOT EXISTS \"VerificationToken_token_key\" ON \"VerificationToken\"(\"token\");\nCREATE UNIQUE INDEX IF NOT EXISTS \"VerificationToken_identifier_token_key\" ON \"VerificationToken\"(\"identifier\", \"token\");\nCREATE TABLE IF NOT EXISTS \"Conversation\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP\n);\nCREATE TABLE IF NOT EXISTS \"ConversationParticipant\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"userId\" TEXT NOT NULL,\n    \"conversationId\" TEXT NOT NULL,\n    \"lastReadAt\" DATETIME\n);\nCREATE UNIQUE INDEX IF NOT EXISTS \"ConversationParticipant_userId_conversationId_key\" ON \"ConversationParticipant\"(\"userId\", \"conversationId\");\nCREATE TABLE IF NOT EXISTS \"Message\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"content\" TEXT NOT NULL,\n    \"senderId\" TEXT NOT NULL,\n    \"conversationId\" TEXT NOT NULL,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    FOREIGN KEY (\"senderId\") REFERENCES \"User\"(\"id\"),\n    FOREIGN KEY (\"conversationId\") REFERENCES \"Conversation\"(\"id\")\n);\nCREATE TABLE IF NOT EXISTS \"Notification\" (\n    \"id\" TEXT NOT NULL PRIMARY KEY,\n    \"type\" TEXT NOT NULL,\n    \"read\" BOOLEAN NOT NULL DEFAULT false,\n    \"createdAt\" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    \"recipientId\" TEXT NOT NULL,\n    \"actorId\" TEXT NOT NULL,\n    \"postId\" TEXT,\n    \"commentId\" TEXT\n);\nCREATE INDEX IF NOT EXISTS \"Notification_recipientId_read_idx\" ON \"Notification\"(\"recipientId\", \"read\");\nCREATE INDEX IF NOT EXISTS \"Notification_recipientId_createdAt_idx\" ON \"Notification\"(\"recipientId\", \"createdAt\");\n";
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var url, token, client, statements, _i, statements_1, stmt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = process.env.DATABASE_URL;
                    token = process.env.TURSO_AUTH_TOKEN;
                    if (!url || !token) {
                        console.error("Set DATABASE_URL and TURSO_AUTH_TOKEN in .env first");
                        process.exit(1);
                    }
                    console.log("Connecting to Turso...");
                    client = (0, client_1.createClient)({ url: url, authToken: token });
                    console.log("Pushing schema...");
                    statements = sql
                        .split(";")
                        .map(function (s) { return s.trim(); })
                        .filter(function (s) { return s.length > 0; });
                    _i = 0, statements_1 = statements;
                    _a.label = 1;
                case 1:
                    if (!(_i < statements_1.length)) return [3 /*break*/, 4];
                    stmt = statements_1[_i];
                    return [4 /*yield*/, client.execute(stmt)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log("Schema pushed to Turso successfully!");
                    client.close();
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (e) {
    console.error("Failed:", e);
    process.exit(1);
});
