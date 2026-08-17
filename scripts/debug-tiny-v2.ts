import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd(),true,{info:()=>{},error:()=>{}});
async function main(){ const { testTinyV2Connection }=await import("../src/lib/repositories/tiny/tiny-v2-connection-test"); const r=await testTinyV2Connection("744931523"); console.dir(r,{depth:null,maxArrayLength:null}); }
main().catch(console.error);
