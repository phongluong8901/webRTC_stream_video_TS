import dns from "dns";
import mongoose from "mongoose";

const PUBLIC_DNS = ["1.1.1.1", "8.8.8.8", "1.0.0.1"];

const expandMongoSrvUri = async (uri: string): Promise<string> => {
  if (!uri.startsWith("mongodb+srv://")) {
    return uri;
  }

  const withoutScheme = uri.slice("mongodb+srv://".length);
  const at = withoutScheme.lastIndexOf("@");
  if (at < 0) {
    throw new Error("Invalid MONGODB_URI: missing credentials host separator");
  }

  const auth = withoutScheme.slice(0, at);
  const hostAndRest = withoutScheme.slice(at + 1);
  const slash = hostAndRest.indexOf("/");
  const question = hostAndRest.indexOf("?");
  let host = hostAndRest;
  let pathname = "";
  let search = "";

  if (slash >= 0) {
    host = hostAndRest.slice(0, slash);
    const afterSlash = hostAndRest.slice(slash);
    const q = afterSlash.indexOf("?");
    if (q >= 0) {
      pathname = afterSlash.slice(0, q);
      search = afterSlash.slice(q + 1);
    } else {
      pathname = afterSlash;
    }
  } else if (question >= 0) {
    host = hostAndRest.slice(0, question);
    search = hostAndRest.slice(question + 1);
  }

  const resolver = new dns.promises.Resolver();
  resolver.setServers(PUBLIC_DNS);
  const records = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
  if (!records.length) {
    throw new Error(`No SRV records found for ${host}`);
  }

  const hosts = records
    .map((record) => `${record.name}:${record.port || 27017}`)
    .join(",");

  const params = new URLSearchParams(search);
  if (!params.has("ssl") && !params.has("tls")) {
    params.set("tls", "true");
  }
  if (!params.has("authSource")) {
    params.set("authSource", "admin");
  }
  if (!params.has("retryWrites")) {
    params.set("retryWrites", "true");
  }

  const path = pathname || "/";
  return `mongodb://${auth}@${hosts}${path}?${params.toString()}`;
};

export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");

  const connectUri = await expandMongoSrvUri(uri);

  try {
    await mongoose.connect(connectUri);
  } catch (error) {
    // Fallback: thu URI goc neu expand that bai / khong can thiet
    if (connectUri !== uri) {
      console.warn(
        "Expanded Mongo URI failed, retrying original mongodb+srv:// ...",
        error instanceof Error ? error.message : error
      );
      await mongoose.connect(uri);
    } else {
      throw error;
    }
  }

  console.log("Connected to MongoDB");
};
