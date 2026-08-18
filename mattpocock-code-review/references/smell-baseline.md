# Fowler smell baseline

- **Mysterious Name**: a name does not reveal purpose. Rename; if no honest name exists, revisit the design.
- **Duplicated Code**: the same logic shape occurs in multiple changed locations. Extract the shared shape.
- **Feature Envy**: a method reaches into another object's data more than its own. Move behavior toward the data.
- **Data Clumps**: the same fields or parameters travel together. Bundle the domain concept into a type.
- **Primitive Obsession**: a primitive stands in for a domain concept. Introduce a small type where it buys safety.
- **Repeated Switches**: repeated conditionals discriminate on the same kind. Centralize the mapping or use polymorphism.
- **Shotgun Surgery**: one logical change requires scattered edits. Gather what changes together.
- **Divergent Change**: one module changes for unrelated reasons. Split responsibilities.
- **Speculative Generality**: abstractions or hooks serve no current requirement. Remove or inline them.
- **Message Chains**: callers navigate deep object chains. Hide navigation behind an intention-revealing method.
- **Middle Man**: a layer mostly delegates without adding value. Call the real target directly.
- **Refused Bequest**: a subtype ignores most inherited behavior. Prefer composition.

Treat every baseline match as a labelled heuristic, suppress it when repository standards endorse the pattern, and avoid issues that automated tooling enforces.
