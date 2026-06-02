import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { RemovalPolicy } from "aws-cdk-lib";

export interface StaticSiteProps {
  /**
   * El dominio principal del sitio (ej: 'miblog.dev').
   * Debe estar registrado en Route 53 como Hosted Zone.
   */
  domainName: string;

  /**
   * El dominio raíz de la Hosted Zone en Route 53.
   * Si despliegas un subdominio, este es el dominio padre.
   *
   * Ejemplos:
   * - domainName='miblog.dev' → hostedZoneDomain='miblog.dev'
   * - domainName='pasteleria.hirambrizuela.dev' → hostedZoneDomain='hirambrizuela.dev'
   *
   * Si no se especifica, asume que es igual a domainName.
   */
  hostedZoneDomain?: string;

  /**
   * Subdominio opcional adicional (ej: 'www').
   * Si lo pasas, www.{domainName} también apuntará al sitio.
   */
  siteSubDomain?: string;

  /**
   * Ruta al directorio con los archivos compilados del sitio.
   * Ejemplo: '../mi-sitio/dist'
   */
  buildPath: string;

  /**
   * Si CDK debe eliminar el bucket al destruir el stack.
   * Útil en desarrollo y proyectos efímeros.
   * En producción déjalo en false (default).
   */
  destroyOnRemoval?: boolean;

  /**
   * Si debe activarse el URL rewriting via CloudFront Function.
   * Útil para sitios con i18n (ej: /en/) o SPAs.
   * Default: true
   */
  enableUrlRewrite?: boolean;
}

/**
 * Construct reutilizable para desplegar un sitio estático en AWS:
 * S3 (privado) + CloudFront + Route 53 + ACM + URL rewriting opcional.
 *
 * Asume que la Hosted Zone del dominio ya existe en Route 53.
 */
export class StaticSite extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: StaticSiteProps) {
    super(scope, id);

    const {
      domainName,
      hostedZoneDomain = domainName,
      siteSubDomain,
      buildPath,
      destroyOnRemoval = false,
      enableUrlRewrite = true,
    } = props;

    // 1. Buscar la Hosted Zone existente
    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: hostedZoneDomain,
    });

    const fullDomain = domainName;
    const wwwDomain = siteSubDomain
      ? `${siteSubDomain}.${domainName}`
      : undefined;
    const allDomains = wwwDomain ? [fullDomain, wwwDomain] : [fullDomain];

    // 2. Certificado SSL con validación DNS automática
    const certificate = new acm.Certificate(this, "Certificate", {
      domainName: fullDomain,
      subjectAlternativeNames: wwwDomain ? [wwwDomain] : undefined,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // 3. Bucket S3 privado
    this.bucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: destroyOnRemoval
        ? RemovalPolicy.DESTROY
        : RemovalPolicy.RETAIN,
      autoDeleteObjects: destroyOnRemoval,
    });

    // 4. CloudFront Function para URL rewriting (opcional)
    let functionAssociations: cloudfront.FunctionAssociation[] | undefined;

    if (enableUrlRewrite) {
      const urlRewriteFunction = new cloudfront.Function(
        this,
        "UrlRewriteFunction",
        {
          code: cloudfront.FunctionCode.fromInline(`
          function handler(event) {
            var request = event.request;
            var uri = request.uri;

            if (uri.endsWith('/')) {
              request.uri = uri + 'index.html';
            } else if (!uri.includes('.')) {
              request.uri = uri + '/index.html';
            }

            return request;
          }
        `),
          runtime: cloudfront.FunctionRuntime.JS_2_0,
        },
      );

      functionAssociations = [
        {
          function: urlRewriteFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        },
      ];
    }

    // 5. Distribución CloudFront con OAC
    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      domainNames: allDomains,
      certificate,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // 6. Deploy del build al bucket con invaldiation automática
    new s3deploy.BucketDeployment(this, "DeploySite", {
      sources: [s3deploy.Source.asset(buildPath)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ["/*"],
    });

    // 7. Registros DNS Alias
    new route53.ARecord(this, "ApexAliasRecord", {
      zone: hostedZone,
      recordName: fullDomain,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(this.distribution),
      ),
    });

    if (wwwDomain) {
      new route53.ARecord(this, "WwwAliasRecord", {
        zone: hostedZone,
        recordName: wwwDomain,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(this.distribution),
        ),
      });
    }
  }
}
