import CompositeNode from "../composite_node";
import { NodeRegistry } from "../types";
import { Selector, ReactiveSelector } from "./selector";
import { Sequence, SequenceWithMemory, ReactiveSequence } from "./sequence";
const compositeNodes: NodeRegistry<typeof CompositeNode>= {
    selector: Selector,
    reactiveSelector: ReactiveSelector,
    sequence: Sequence,
    reactiveSequence: ReactiveSequence,
    sequenceWithMemory: SequenceWithMemory,
};
export default compositeNodes;
