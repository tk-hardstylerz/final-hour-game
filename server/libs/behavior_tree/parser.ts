import { XmlDocument, XmlElement } from "xmldoc";
import Blackboard from "./blackboard";
import actionNodes from "./action_nodes";
import decoratorNodes from "./decorator_nodes";
import compositeNodes from "./composite_nodes";
import { NodeParams } from "./types";
import Node from "./node";
import conditionNodes from "./condition_nodes";
import { parseValue } from "../string_utils";

export function parseBehaviorTreeXml(data: string): XmlElement {
    const doc = new XmlDocument(data);
    const behaviorTreeElement =
        doc.name === "behaviorTree" ? doc : doc.childNamed("behaviorTree");
    if (behaviorTreeElement) {
        return behaviorTreeElement;
    }
    throw new Error("Document does not define a `behaviorTree` element");
}

export function parseBehaviorTreeNode(
    element: XmlElement,
    blackboard: Blackboard
): Node {
    const elementTraceString = `At line ${element.line} and column ${element.column}`;
    const args: NodeParams = {
        blackboard: blackboard,
        id: element.attr.id || undefined,
        params: Object.fromEntries(
            // This unreadable mess converts attribute key-value pairs to parsed values. It creates a derived object with the same keys, but the values are parsed. This way is supposedly faster than a loop.
            Object.entries(element.attr).map(([key, value]) => [
                key,
                parseValue(value),
            ])
        ),
    };
    if (element.name === "behaviorTree") {
        for (const node of element.children) {
            if (node instanceof XmlElement) {
                // the above check is to skip text nodes
                // We're now at the root node, so recursively construct the tree from here.
                return parseBehaviorTreeNode(node, blackboard);
            }
        }
    } else if (element.name in conditionNodes) {
        return new conditionNodes[element.name]({
            ...args,
        });
    } else if (element.name in actionNodes) {
        /// Condition nodes are the same as action nodes. We split them though for possible future expansion
        return new actionNodes[element.name]({
            ...args,
        });
    } else if (element.name in decoratorNodes) {
        // find the first non-text child.
        const child = element.children.find(
            (child) => child instanceof XmlElement
        ) as XmlElement | undefined;
        if (child) {
            return new decoratorNodes[element.name]({
                ...args,
                child: parseBehaviorTreeNode(child, blackboard), /// Recursively parse the child
            });
        } else {
            throw new Error(
                `A ${element.name} node must have a child node. ${elementTraceString}`
            );
        }
    } else if (element.name in compositeNodes) {
        // Filter out text nodes so we only work on xml elements.
        const children = element.children.filter(
            (child) => child instanceof XmlElement
        ) as XmlElement[];
        if (children.length > 0) {
            return new compositeNodes[element.name]({
                ...args,
                children: children.map(
                    (child) => parseBehaviorTreeNode(child, blackboard) /// Recursively parse each child
                ),
            });
        } else {
            throw new Error(
                `A ${element.name} node must have at least 1 child node. ${elementTraceString}`
            );
        }
    }
    throw new Error(`Unknown node: ${element.name}. ${elementTraceString}`);
}
