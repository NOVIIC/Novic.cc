import * as React from 'react'
import Layout from "../componments/layout"
import Container from "../componments/container"
import { Link } from "gatsby"

const main = () => (
  <div style={{ color: `purple` }}>
    <title>HAVEN'T DONE</title>
    <Layout>
      <Container>
        <p>Test Page</p>
      </Container>
      <Link to='/'>Home</Link>
    </Layout>
  </div>
)
export default main