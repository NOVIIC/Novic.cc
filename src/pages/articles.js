import * as React from 'react'
import Layout from "../componments/layout"
import { Link } from "gatsby"

const main = () => (
  <div style={{ color: `purple` }}>
    <title>NovicNet - articles</title>
    <Layout>
      <p>Test Page</p>
      <Link to='/'>Home</Link>
    </Layout>
  </div>
)
export default main