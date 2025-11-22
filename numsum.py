import numpy as np
from itertools import groupby

class FieldSum:
    def __init__(self, sum:int, fields:set[tuple[int, int]], tag:str):
        self.targetSum = sum
        self.fields = fields
        self.tag = tag
    
    def __repr__(self):
        return f'sum={self.targetSum}, tag={self.tag}, fields=[{self.fields}]'

    def sum(self, board):
        return sum(map(lambda xy: board[xy[0], xy[1]], self.fields))



numbers = np.array([
    [8, 6, 3, 8, 2, 8, 4],
    [2, 8, 5, 1, 3, 6, 3],
    [2, 9, 2, 2, 9, 1, 3],
    [3, 8, 5, 1, 3, 9, 1],
    [6, 3, 9, 9, 6, 8, 8],
    [5, 1, 2, 1, 4, 3, 8],
    [9, 9, 5, 3, 4, 2, 3],
    
], dtype=int).T

(w, h) = numbers.shape

group_keys = np.array([
    list("rrooyyy"),
    list("rrooyyy"),
    list("rcoooyg"),
    list("rcccccg"),
    list("rpbbbbg"),
    list("pppbbgg"),
    list("pppbbgg")
], dtype=str).T

fields = [ (x, y) for x in range(w) for y in range(h) ] 
group_key = lambda it: group_keys[it[0], it[1]]
group_sums = { 'r': 27, 'o': 20, 'y': 14, 'c':25, 'g': 5, 'p': 5, 'b': 14 }
group_fields = groupby(sorted(fields, key=group_key), key=group_key)

col_sums = [13, 14, 19, 12, 18, 31, 3]
row_sums = [24, 14, 14, 20, 23, 8, 7]

sums = [ FieldSum(sum=group_sums[key], fields=set(fields), tag=key) for key, fields in group_fields ]
sums += [ FieldSum(sum=sum, fields=set([(x, y) for y in range(h)]), tag=f'col{x}') for x, sum in enumerate(col_sums)]
sums += [ FieldSum(sum=sum, fields=set([(x, y) for x in range(w)]), tag=f'col{y}') for y, sum in enumerate(row_sums)]
for s in sums: print(s.tag, s.sum(numbers))


def draw():
    colors = {
        'r': '\033[41m',
        'o': '\033[103m',
        'y': '\033[43m',
        'c': '\033[46m',
        'p': '\033[45m',
        'b': '\033[44m',
        'g': '\033[42m',
    }

    print('   ', end='')
    for x in range(w):
        print(f'{col_sums[x]: >2}', sep='', end=' ')
    print()

    for y in range(w):
        print(f'{row_sums[y]: >2}', sep='', end=' ')
        for x in range(h):
            number = numbers[x, y]
            color = colors[group_keys[x, y]]
            print(color, ' ', number, sep='', end=' \033[0m')
        print()

draw()
# (w, h) = board.shape



# sums = [
#     FieldSum(27).add(0, 0, h=5).add(1, 0, h=2).tagged('red'),
#     FieldSum(20).add(2, 0, w=2, h=3).add(4, 2).tagged('orange'),
#     FieldSum(14).add(4, 0, w=3, h=2).add(5, 2).tagged('yellow'),
#     FieldSum(25).add(1, 3, w=5).add(1, 2).tagged('blue'),
#     FieldSum(5).add(0, 5, w=3, h=2).add(1, 4).tagged('pink'),
#     FieldSum(14).add(3, 4, w=2, h=3).add(2, 4).tagged('violet'),
#     FieldSum(5).add(6, 2, h=5).add(5, 5, h=2).tagged('green')
# ]



# for sum in sums: print(sum.sum, sum.tag)