import * as React from 'react'
import Container from "../componments/container"
import Layout from "../componments/layout"
import { Link } from "gatsby"

const main = () => (
  <div style={{ color: `purple`, margin: `3rem auto`, maxWidth: 600}}>
    <title>HAVEN'T DONE</title>
    <Layout />
    <Container>
      <p>Test Page</p>
    </Container>
    <Link to='/'>Home</Link>
  </div>
)
export default main