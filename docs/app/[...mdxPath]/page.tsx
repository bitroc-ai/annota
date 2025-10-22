import { generateStaticParamsFor, importPage } from 'nextra/pages';
import type { FC } from 'react';

export async function generateStaticParams() {
  const params = await generateStaticParamsFor('mdxPath')();
  return params;
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const { metadata } = await importPage(params.mdxPath || []);
  return metadata;
}

type PageProps = Readonly<{
  params: Promise<{
    mdxPath?: string[];
  }>;
}>;

const Page: FC<PageProps> = async props => {
  const params = await props.params;
  const result = await importPage(params.mdxPath || []);
  const { default: MDXContent } = result;

  return <MDXContent {...props} params={params} />;
};

export default Page;
