import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { StaticSite, StaticSiteProps } from "./static-site-construct";

export interface StaticSiteStackProps extends cdk.StackProps {
  // Configuración del sitio estático
  site: StaticSiteProps;
}

export class HiramCdkStaticSiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StaticSiteStackProps) {
    super(scope, id, props);

    new StaticSite(this, "Site", props.site);
  }
}
