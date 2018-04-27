# Algorithm for finding fragments

## Finding the cut points

Select k-tuples of residues such that the common parent for the
members of the k-tuples are not within the k-tuple (i.e. the 
first common parent of any cut-point is not a cut-point). This
gives you a set of reducing end (i.e. keeping the root) fragment
cut points with k-cleavages each.

If you want to generate non-reducing end cleavages too, you need
to start with the common parent for each k-tuple, and traverse up
to the root. This traversal up to the root will give the cut-points
for the non-reducing end fragments, and you end up with a set of
k+1-cleavage sets.

## Which children are kept in a cross-ring event?
`Child(?u-n)Parent`

`n > 1` (i.e. has defined linkage)

```
if (n > 5)
	n = 5
```

*i,j-x (Reducing end cleavage):* 

`n <= j && (i == 0)` -> Included

`(n <= i || n > j) && i != 0` -> Included

*i,j-a (Non-reducing end cleavage):*

`n <= j && (i == 0)` -> Removed
`( n <= i || n > j ) && i != 0` -> Removed


## Calculating masses

Total sugar mass = `Sum(monosaccharide masses) + O + 2 * R`

`R = H` for underivatised
`R = CH3` for permethylated


The baseline fragment mass is given by:
```
Sum(monosaccharide masses in fragment)
```

Any fragment set starting with a

y:
	`+ H`

b:
	`+ R - H`

z:
	`- O - H`

c:
	`+ O + H + R`

x:
	`+ R`



Reducing end fragments all get an additional mass of:
```	
O + R
```


For every additional cleavage (over the first):
```
-R
```

You can emulate linear cross-rings by converting:

1,5-a -> 1,1-e (`+ O`)
0,2-a -> 2,2-e
3,5-a -> 3,3-e (`+ O`)
0,4-a -> 4,4-e
0,4-a -> 5,5-e (`- O - 2 * H - C`)
1,3-a -> 1,3-e
2,4-a -> 2,4-e
3,4-a -> 3,5-e (`+ 2 * H + C`)

1,5-x -> 1,1-w (`- 2 * H - O`)
0,2-x -> 2,2-w (`- 2 * H`)
3,5-x -> 3,3-w (`- 2 * H - O`)
0,4-x -> 4,4-w (`- 2 * H`)
0,4-x -> 5,5-w (`+ O + C + H`)

