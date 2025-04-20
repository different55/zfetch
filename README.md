# Zfetch

*Better input handling for Zdog, the pseudo-3D engine.*

## Status

Currently un-minified and under active development.

## About Zfetch

I'm working on an application built on Zdog and I needed better input handling
that was aware of Zdog and its quirks. What Zfetch does is allow you to set
event event handlers for `click` and `pointerdown/move/up` events and have
those handlers be aware of exactly which Zdog shape the mouse is over.

In the future, I'd like to support setting event handlers on arbitrary Zdog
objects and have events bubble up the Zdog hierarchy. Currently, all events
pass through the root SVG or Canvas and must be delegated from there.

Current limitations:
 - Canvas is not supported, only SVG. (This wouldn't be a large task)

Pull requests and suggestions are welcome!

This is currently being actively developed alongside [Zoodle](https://github.com/different55/zoodle).