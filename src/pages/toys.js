import * as React from 'react'
import Layout from "../componments/layout"

const Links = props => (
  <p>
    <a target="_blank" rel="noreferrer" href={props.href}>{props.children}</a>
  </p>
)

const main = () => (
  <div>
    <title>NovicNet - toys</title>
    <Layout>
      <Links href='https://bing.novic.cc'>BingAI</Links>
      <Links href='https://unlockmusic.novic.cc/'>UnlockMusic</Links>
      <p>External Links</p>
      <Links href='https://hack.chat/?novicnet'>NovicNet HackChat Room</Links>
    </Layout>
  </div>
)
export default main