#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { HiramCdkStaticSiteStack } from "../lib/hiram-cdk-static-site-stack";

const app = new cdk.App();

// us-east-1 es obligatorio para CloudFront + ACM
const env = {
  account: "973592936244",
  region: "us-east-1",
};

// =====================================================================
// EJEMPLOS DE USO
// =====================================================================
// Descomenta el ejemplo que necesites, ajusta los valores y deploya con:
//   cdk deploy NombreDelStack
// =====================================================================

// --- Ejemplo 1: subdominio del dominio principal ---
// new HiramCdkStaticSiteStack(app, 'PasteleriaStack', {
//   env,
//   description: 'Landing page de pastelería en subdominio',
//   site: {
//     domainName: 'pasteleria.hirambrizuela.dev',
//     hostedZoneDomain: 'hirambrizuela.dev',
//     buildPath: '../mi-pasteleria/dist',
//     enableUrlRewrite: false,
//     destroyOnRemoval: true,
//   },
// });

// --- Ejemplo 2: dominio propio con www ---
// new HiramCdkStaticSiteStack(app, 'MiBlogStack', {
//   env,
//   description: 'Blog técnico personal',
//   site: {
//     domainName: 'miblog.dev',
//     siteSubDomain: 'www',
//     buildPath: '../mi-blog/dist',
//     enableUrlRewrite: true,
//   },
// });

// --- Ejemplo 3: sitio con i18n (estilo portafolio) ---
// new HiramCdkStaticSiteStack(app, 'PortfolioStack', {
//   env,
//   description: 'Portafolio personal con soporte i18n',
//   site: {
//     domainName: 'midominio.dev',
//     siteSubDomain: 'www',
//     buildPath: '../mi-portafolio/dist',
//     enableUrlRewrite: true,
//   },
// });
