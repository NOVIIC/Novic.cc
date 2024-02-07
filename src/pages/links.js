import * as React from 'react'
import Layout from "../componments/layout"

const Links = props => (
  <p>
    <a target="_blank" rel="noreferrer" href={props.href}>{props.children}</a>
  </p>
)

const main = () => (
  <div>
    <title>NovicNet - links</title>
    <Layout>
      <Links href="https://rss.novic.cc">novic's rssHub</Links>
      <Links href="https://pan.yukaidi.com/s/E5B8Cd">Cloud Shares</Links>
    </Layout>
  </div>
)
export default main