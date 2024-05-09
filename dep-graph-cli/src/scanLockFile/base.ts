import { IGraphData } from '../type'

export abstract class baseDepGraph {
  abstract parse(): Promise<IGraphData>
}
